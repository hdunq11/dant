"""
Sinh lưới stage_1: 2 khối × 500 ghế (20 hàng × 25 cột), lối đi giữa.
Đánh số: khối trái 1–500, khối phải 501–1000 (theo bảng Excel).

Ví dụ Concert 76:
  python manage.py setup_stage1_grid \\
    --concert-id ec602958-78d2-40f9-bd5e-3ab195e1ce29 \\
    --import-gltf
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.concerts.models import Concert
from app.seats.models import ConcertSeat, Seat, SeatZone
from app.seats.stage1_seat_grid import (
    STAGE1_SEATS_PER_ROW,
    STAGE1_TOTAL_SEATS,
    STAGE1_ZONE_ROWS,
    stage1_seat_pos_2d,
)
from app.venues.models import Venue


class Command(BaseCommand):
    help = 'Sinh 1000 ghế stage_1: 2 khối 500 (20×25 | lối đi | 20×25)'

    def add_arguments(self, parser):
        parser.add_argument('--venue-id', help='UUID venue')
        parser.add_argument('--concert-id', help='UUID concert (tự lấy venue + resync)')
        parser.add_argument('--import-gltf', action='store_true', help='Chạy import stage_1 GLTF sau khi sinh ghế')
        parser.add_argument('--gltf', default='../FE/public/models/stage_1/scene.gltf')
        parser.add_argument('--model-path', default='models/stage_1/scene.gltf')

    def handle(self, *args, **options):
        venue, concert = self._resolve_targets(options)
        zone_rows = STAGE1_ZONE_ROWS

        with transaction.atomic():
            removed_cs = ConcertSeat.objects.filter(seat__venue=venue).count()
            ConcertSeat.objects.filter(seat__venue=venue).delete()
            removed_seats = Seat.objects.filter(venue=venue).delete()[0]
            self.stdout.write(f'Removed {removed_seats} venue seats, {removed_cs} concert_seats')

            created = 0
            for zone_name, row_labels in zone_rows.items():
                zone = SeatZone.objects.filter(venue=venue, name__iexact=zone_name).first()
                if zone is None:
                    self.stdout.write(self.style.WARNING(f'  Skip missing zone: {zone_name}'))
                    continue
                for row_label in row_labels:
                    row_idx = ord(row_label) - ord('A')
                    for seat_num in range(1, STAGE1_SEATS_PER_ROW + 1):
                        pos_x, pos_y = stage1_seat_pos_2d(row_idx, seat_num)
                        Seat.objects.create(
                            venue=venue,
                            zone=zone,
                            row_label=row_label,
                            seat_number=seat_num,
                            pos_x=pos_x,
                            pos_y=pos_y,
                            pos_z=0.0,
                        )
                        created += 1
                self.stdout.write(
                    f'  Zone {zone.name}: {len(row_labels)} rows x {STAGE1_SEATS_PER_ROW} = '
                    f'{len(row_labels) * STAGE1_SEATS_PER_ROW} seats'
                )

            if created != STAGE1_TOTAL_SEATS:
                raise CommandError(f'Expected {STAGE1_TOTAL_SEATS} seats, created {created}')

            concerts = list(Concert.objects.filter(venue=venue))
            if concert and all(c.id != concert.id for c in concerts):
                concerts.append(concert)

            for c in concerts:
                wrong = ConcertSeat.objects.filter(concert=c).exclude(seat__venue=venue).delete()[0]
                if wrong:
                    self.stdout.write(f'Removed {wrong} orphan concert_seats from {c.title}')
                ConcertSeat.objects.filter(concert=c).delete()
                ConcertSeat.objects.bulk_create(
                    [
                        ConcertSeat(concert=c, seat=seat, status='available')
                        for seat in Seat.objects.filter(venue=venue).order_by('row_label', 'seat_number')
                    ]
                )
                total = ConcertSeat.objects.filter(concert=c, seat__venue=venue).count()
                self.stdout.write(self.style.SUCCESS(f'Concert {c.title}: {total} concert_seats'))

            venue.model_glb_path = options['model_path']
            venue.save(update_fields=['model_glb_path'])

        if options['import_gltf']:
            from django.core.management import call_command

            call_command(
                'import_seats_from_stage1',
                gltf=options['gltf'],
                venue_id=str(venue.id),
                model_path=options['model_path'],
                aisle_after=25,
            )

        self.stdout.write(self.style.SUCCESS(
            f'Done — {venue.name}: {STAGE1_TOTAL_SEATS} seats (2×500, 20×25)'
        ))

    def _resolve_targets(self, options):
        concert = None
        if options.get('concert_id'):
            try:
                concert = Concert.objects.select_related('venue').get(id=options['concert_id'])
            except Concert.DoesNotExist as exc:
                raise CommandError(f'Concert not found: {options["concert_id"]}') from exc
            return concert.venue, concert

        if options.get('venue_id'):
            try:
                venue = Venue.objects.get(id=options['venue_id'])
            except Venue.DoesNotExist as exc:
                raise CommandError(f'Venue not found: {options["venue_id"]}') from exc
            return venue, None

        raise CommandError('Need --venue-id or --concert-id')
