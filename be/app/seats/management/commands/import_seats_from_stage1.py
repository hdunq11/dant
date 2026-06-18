"""
Import tọa độ ghế 3D từ model stage_1 (virtual fair).

Ví dụ Concert 76 / venue MyDinosaur #33:
  python manage.py import_seats_from_stage1 \\
    --gltf ../FE/public/models/stage_1/scene.gltf \\
    --venue-id e5b526ed-5d00-47b6-8cc0-43ee6ceb5dfe \\
    --model-path models/stage_1/scene.gltf
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.seats.gltf_import_stage1 import (
    detect_stage1_audience_bounds,
    extract_stage1_physical_centers,
    map_stage1_venue_seats,
)
from app.seats.models import Seat
from app.venues.models import Venue


class Command(BaseCommand):
    help = 'Import tọa độ ghế từ GLTF stage_1 (không dùng seat_seat_0 Sketchfab)'

    def add_arguments(self, parser):
        parser.add_argument('--gltf', required=True, help='Đường dẫn scene.gltf của stage_1')
        parser.add_argument('--venue', help='Tên venue (exact match)')
        parser.add_argument('--venue-id', help='UUID venue')
        parser.add_argument('--all-venues', action='store_true', help='Áp dụng cho mọi venue')
        parser.add_argument('--dry-run', action='store_true', help='Chỉ xem trước, không ghi DB')
        parser.add_argument(
            '--model-path',
            default='models/stage_1/scene.gltf',
            help='Lưu đường dẫn GLTF vào venue.model_glb_path',
        )
        parser.add_argument(
            '--aisle-after',
            type=int,
            default=25,
            help='Số ghế khối trái trước lối đi (mặc định 25 cho lưới 50 cột)',
        )

    def handle(self, *args, **options):
        gltf_path = options['gltf']
        dry_run = options['dry_run']

        bounds = detect_stage1_audience_bounds(gltf_path)
        if bounds is None:
            raise CommandError('Không đọc được vùng khán đài từ file GLTF stage_1')

        physical = extract_stage1_physical_centers(gltf_path)
        self.stdout.write(
            f'stage_1 bounds: x={bounds.min_x:.2f}..{bounds.max_x:.2f} '
            f'z={bounds.min_z:.2f}..{bounds.max_z:.2f} seat_y={bounds.seat_y:.2f}'
        )
        self.stdout.write(f'Physical seat clusters detected: {len(physical)}')

        if options['all_venues']:
            venues = list(Venue.objects.all().order_by('name'))
            if not venues:
                raise CommandError('Không có venue nào trong DB')
        else:
            venues = [self._resolve_venue(options)]

        total_updated = 0
        for venue in venues:
            self.stdout.write(f'\n=== {venue.name} ({venue.id}) ===')
            seats = list(
                Seat.objects.filter(venue=venue)
                .select_related('zone')
                .order_by('row_label', 'seat_number')
            )
            if not seats:
                self.stdout.write(self.style.WARNING('  Venue không có ghế — bỏ qua'))
                continue

            try:
                markers = map_stage1_venue_seats(
                    seats,
                    gltf_path,
                    aisle_after=options['aisle_after'],
                )
            except ValueError as exc:
                self.stdout.write(self.style.ERROR(f'  {exc}'))
                continue

            self.stdout.write(f'  Mapped {len(markers)} / {len(seats)} seats')
            updated = self._apply_markers(venue, markers, dry_run)
            total_updated += updated

            if options.get('model_path') and not dry_run:
                venue.model_glb_path = options['model_path']
                venue.save(update_fields=['model_glb_path'])
                self.stdout.write(f'  model_glb_path -> {options["model_path"]}')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Done — total seats updated: {total_updated}'))

    def _apply_markers(self, venue: Venue, markers, dry_run: bool) -> int:
        marker_map = {
            (m.row, m.number): m
            for m in markers
        }
        seats = Seat.objects.filter(venue=venue).select_related('zone')
        updated = 0
        touched_ids: set = set()

        with transaction.atomic():
            for seat in seats:
                marker = marker_map.get((seat.row_label, seat.seat_number))
                if marker is None:
                    continue

                if dry_run:
                    self.stdout.write(
                        f'  [dry-run] {seat.zone.name} {seat.row_label}{seat.seat_number} -> '
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
                    self.stdout.write(f'  Cleared 3D coords for {cleared} seats without mapping')

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
