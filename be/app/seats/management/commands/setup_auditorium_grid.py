"""
Sinh lại lưới ghế 12×28 (336 ghế) cho venue — chia zone theo hàng A–L.

Ví dụ Concert 91:
  python manage.py setup_auditorium_grid --concert-id 3d47bed2-e2a9-415f-8c05-73f2281e6de3 --import-gltf
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.concerts.models import Concert
from app.seats.models import ConcertSeat, Seat, SeatZone
from app.seats.seat_grid import (
    DEFAULT_AISLE_AFTER,
    DEFAULT_SEATS_PER_ROW,
    DEFAULT_ZONE_ROWS,
    seat_pos_2d,
)
from app.venues.models import Venue


class Command(BaseCommand):
    help = 'Sinh lại 336 ghế (12 hàng × 28 cột) và đồng bộ concert_seats'

    def add_arguments(self, parser):
        parser.add_argument('--venue-id', help='UUID venue')
        parser.add_argument('--concert-id', help='UUID concert (tự lấy venue + resync)')
        parser.add_argument('--import-gltf', action='store_true', help='Chạy import GLTF sau khi sinh ghế')
        parser.add_argument('--gltf', default='../FE/public/models/venue_stage_1/scene.gltf')
        parser.add_argument('--model-path', default='models/venue_stage_1/scene.gltf')

    def handle(self, *args, **options):
        venue, concert = self._resolve_targets(options)
        zone_rows = DEFAULT_ZONE_ROWS

        with transaction.atomic():
            removed_cs = ConcertSeat.objects.filter(seat__venue=venue, seat__concert__isnull=True).count()
            ConcertSeat.objects.filter(seat__venue=venue, seat__concert__isnull=True).delete()
            removed_seats = Seat.objects.filter(venue=venue, concert__isnull=True).delete()[0]
            self.stdout.write(f'Removed {removed_seats} venue seats, {removed_cs} concert_seats')

            created = 0
            for zone_name, row_labels in zone_rows.items():
                zone = SeatZone.objects.filter(venue=venue, concert__isnull=True, name__iexact=zone_name).first()
                if zone is None:
                    self.stdout.write(self.style.WARNING(f'  Skip missing zone: {zone_name}'))
                    continue
                for row_label in row_labels:
                    row_idx = ord(row_label) - ord('A')
                    for seat_num in range(1, DEFAULT_SEATS_PER_ROW + 1):
                        pos_x, pos_y = seat_pos_2d(row_idx, seat_num, aisle_after=DEFAULT_AISLE_AFTER)
                        Seat.objects.create(
                            venue=venue,
                            concert=None,
                            zone=zone,
                            row_label=row_label,
                            seat_number=seat_num,
                            pos_x=pos_x,
                            pos_y=pos_y,
                            pos_z=0.0,
                        )
                        created += 1
                self.stdout.write(f'  Zone {zone.name}: {len(row_labels)} rows x 28 = {len(row_labels) * 28} seats')

            if created != 336:
                raise CommandError(f'Expected 336 seats, created {created}')

            if concert:
                wrong = ConcertSeat.objects.filter(concert=concert).exclude(seat__venue=venue).delete()[0]
                if wrong:
                    self.stdout.write(f'Removed {wrong} orphan concert_seats from other venues')
                ConcertSeat.objects.filter(concert=concert).delete()
                ConcertSeat.objects.bulk_create(
                    [
                        ConcertSeat(concert=concert, seat=seat, status='available')
                        for seat in Seat.objects.filter(venue=venue, concert__isnull=True).order_by('row_label', 'seat_number')
                    ]
                )
                total = ConcertSeat.objects.filter(concert=concert, seat__venue=venue).count()
                self.stdout.write(self.style.SUCCESS(f'Concert {concert.title}: {total} concert_seats'))

        if options['import_gltf']:
            from django.core.management import call_command

            call_command(
                'import_seats_from_gltf',
                mode='sketchfab',
                gltf=options['gltf'],
                venue_id=str(venue.id),
                model_path=options['model_path'],
            )

        self.stdout.write(self.style.SUCCESS(f'Done — {venue.name}: 336 seats'))

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
