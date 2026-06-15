"""
Import / cập nhật tọa độ ghế từ file GLTF/GLB vào database.

Cách dùng:
  # Model Sketchfab (seat_seat_0) — map 5 khối ghế → 5 zone
  python manage.py import_seats_from_gltf --mode sketchfab --gltf ../FE/public/models/venue_stage_1/scene.gltf --all-venues --model-path models/venue_stage_1/scene.gltf

  # Model có tên ghế rõ ràng
  python manage.py import_seats_from_gltf --mode named --venue "MyDinosaur" --gltf venue.glb
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.seats.gltf_import import (
    extract_seat_markers,
    extract_sketchfab_seat_sections,
    map_sketchfab_zones_to_markers,
)
from app.seats.models import Seat, SeatZone
from app.venues.models import Venue


class Command(BaseCommand):
    help = 'Đọc GLTF/GLB và map tọa độ ghế (pos_x, pos_y, pos_z) vào database'

    def add_arguments(self, parser):
        parser.add_argument('--gltf', required=True, help='Đường dẫn file .glb hoặc .gltf')
        parser.add_argument('--mode', choices=['named', 'sketchfab'], default='sketchfab')
        parser.add_argument('--venue', help='Tên venue (exact match)')
        parser.add_argument('--venue-id', help='UUID venue')
        parser.add_argument('--all-venues', action='store_true', help='Áp dụng cho mọi venue')
        parser.add_argument('--dry-run', action='store_true', help='Chỉ xem trước, không ghi DB')
        parser.add_argument(
            '--model-path',
            help='Lưu đường dẫn GLTF vào venue.model_glb_path (vd: models/venue_stage_1/scene.gltf)',
        )

    def handle(self, *args, **options):
        gltf_path = options['gltf']
        dry_run = options['dry_run']
        mode = options['mode']

        if options['all_venues']:
            venues = list(Venue.objects.all().order_by('name'))
            if not venues:
                raise CommandError('Không có venue nào trong DB')
        else:
            venues = [self._resolve_venue(options)]

        if mode == 'sketchfab':
            sections = extract_sketchfab_seat_sections(gltf_path)
            self.stdout.write(f'Sketchfab mode: {len(sections)} seat blocks in GLTF')
            for i, s in enumerate(sections):
                self.stdout.write(
                    f'  [{i}] mesh={s.mesh_index} z={s.min_z:.2f}..{s.max_z:.2f} x={s.min_x:.2f}..{s.max_x:.2f}'
                )
        else:
            markers = extract_seat_markers(gltf_path)
            if not markers:
                raise CommandError(
                    'Không tìm thấy ghế đặt tên trong GLTF. Dùng --mode sketchfab hoặc đặt tên seat_VIP_A_1'
                )
            self.stdout.write(f'Named mode: {len(markers)} seats')

        total_updated = 0
        for venue in venues:
            self.stdout.write(f'\n=== {venue.name} ({venue.id}) ===')
            if mode == 'sketchfab':
                from app.seats.gltf_import import build_full_auditorium_grid
                physical = build_full_auditorium_grid(gltf_path)
                self.stdout.write(f'Auditorium grid: {len(physical)} slots (12x28)')
                zones = list(SeatZone.objects.filter(venue=venue).order_by('-price', 'name'))
                zone_seats = []
                for zone in zones:
                    seats = list(
                        Seat.objects.filter(venue=venue, zone=zone).order_by('row_label', 'seat_number')
                    )
                    zone_seats.append((zone.name, seats))
                    self.stdout.write(f'  Zone {zone.name}: {len(seats)} seats')
                markers = map_sketchfab_zones_to_markers(gltf_path, zone_seats)
            else:
                markers = extract_seat_markers(gltf_path)

            updated = self._apply_markers(venue, markers, dry_run)
            total_updated += updated

            if options.get('model_path') and not dry_run:
                venue.model_glb_path = options['model_path']
                venue.save(update_fields=['model_glb_path'])

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Done - total seats updated: {total_updated}'))

    def _apply_markers(self, venue: Venue, markers, dry_run: bool) -> int:
        updated = 0
        touched_ids: set = set()
        with transaction.atomic():
            for marker in markers:
                zone = SeatZone.objects.filter(venue=venue, name__iexact=marker.zone).first()
                if zone is None:
                    zone = SeatZone.objects.filter(venue=venue, name__iexact=marker.zone.upper()).first()
                if zone is None:
                    self.stdout.write(self.style.WARNING(f'  Bỏ qua zone {marker.zone}'))
                    continue

                seat = Seat.objects.filter(
                    venue=venue,
                    zone=zone,
                    row_label=marker.row,
                    seat_number=marker.number,
                ).first()
                if seat is None:
                    continue

                if dry_run:
                    self.stdout.write(
                        f'  [dry-run] {zone.name} {marker.row}{marker.number} → '
                        f'({marker.pos_x:.3f}, {marker.pos_y:.3f}, {marker.pos_z:.3f})'
                    )
                else:
                    seat.pos_x = marker.pos_x
                    seat.pos_y = marker.pos_y
                    seat.pos_z = marker.pos_z
                    seat.save(update_fields=['pos_x', 'pos_y', 'pos_z'])
                    touched_ids.add(seat.id)
                updated += 1

            if not dry_run and touched_ids:
                cleared = (
                    Seat.objects.filter(venue=venue)
                    .exclude(id__in=touched_ids)
                    .update(pos_x=0, pos_y=0, pos_z=0)
                )
                if cleared:
                    self.stdout.write(f'  Cleared 3D coords for {cleared} seats without physical slot')

            if dry_run:
                transaction.set_rollback(True)
        return updated

    def _resolve_venue(self, options) -> Venue:
        if options.get('venue_id'):
            try:
                return Venue.objects.get(id=options['venue_id'])
            except Venue.DoesNotExist as exc:
                raise CommandError(f'Không tìm thấy venue id={options["venue_id"]}') from exc
        if options.get('venue'):
            venue = Venue.objects.filter(name=options['venue']).first()
            if venue:
                return venue
            raise CommandError(f'Không tìm thấy venue tên "{options["venue"]}"')
        raise CommandError('Cần --venue, --venue-id hoặc --all-venues')
