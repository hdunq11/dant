"""Đồng bộ sơ đồ 2D + tọa độ 3D khi organizer concert được duyệt."""
from __future__ import annotations

import logging
from pathlib import Path

from django.conf import settings
from django.db import transaction

from app.concerts.models import Concert
from app.seats.gltf_import import map_sketchfab_zones_to_markers
from app.seats.gltf_import_stage1 import map_stage1_venue_seats
from app.seats.models import Seat
from app.seats.stage_templates import (
    STAGE_TEMPLATE_AUDITORIUM,
    STAGE_TEMPLATE_STAGE1,
    get_stage_template,
    sync_concert_stage_on_approval,
    venue_physical_seats,
)

logger = logging.getLogger(__name__)

REPO_ROOT = Path(settings.BASE_DIR).parent

GLTF_SOURCE_FILES: dict[str, Path] = {
    STAGE_TEMPLATE_AUDITORIUM: REPO_ROOT / 'FE/public/models/venue_stage_1/scene.gltf',
    STAGE_TEMPLATE_STAGE1: REPO_ROOT / 'FE/public/models/stage_1/scene.gltf',
}


def should_sync_stage_on_approval(concert: Concert) -> bool:
    return bool(
        concert.stage_template
        and concert.desired_seat_count
        and concert.event_source == 'external'
    )


def _zone_seat_groups_for_venue(venue, template_id: str) -> list[tuple[str, list]]:
    from app.seats.models import SeatZone

    groups: list[tuple[str, list]] = []
    for zone in SeatZone.objects.filter(venue=venue, concert__isnull=True).order_by('-price', 'name'):
        seats = list(
            venue_physical_seats(venue).filter(zone=zone).order_by('row_label', 'seat_number')
        )
        if seats:
            groups.append((zone.name, seats))
    return groups


def _apply_markers_to_venue(venue, markers) -> int:
    marker_map = {(m.row, m.number): m for m in markers}
    updated = 0
    touched_ids: set = set()

    for seat in venue_physical_seats(venue):
        marker = marker_map.get((seat.row_label, seat.seat_number))
        if marker is None:
            continue
        seat.pos_x = marker.pos_x
        seat.pos_y = marker.pos_y
        seat.pos_z = marker.pos_z
        seat.save(update_fields=['pos_x', 'pos_y', 'pos_z'])
        touched_ids.add(seat.id)
        updated += 1

    return updated


def import_gltf_coordinates_for_venue(venue, template_id: str) -> int:
    """Import 3D một lần cho sân khấu venue — dùng chung mọi concert tại venue."""
    gltf_path = GLTF_SOURCE_FILES.get(template_id)
    if gltf_path is None or not gltf_path.is_file():
        raise FileNotFoundError(f'Không tìm thấy file GLTF: {gltf_path}')

    seats = list(venue_physical_seats(venue).order_by('row_label', 'seat_number'))
    if not seats:
        return 0

    # Bỏ qua nếu đã có tọa độ 3D
    with_coords = sum(1 for s in seats if (s.pos_z or 0) != 0)
    if with_coords >= len(seats) * 0.8:
        return 0

    if template_id == STAGE_TEMPLATE_AUDITORIUM:
        zone_groups = _zone_seat_groups_for_venue(venue, template_id)
        if not zone_groups:
            return 0
        markers = map_sketchfab_zones_to_markers(gltf_path, zone_groups)
    elif template_id == STAGE_TEMPLATE_STAGE1:
        markers = map_stage1_venue_seats(seats, gltf_path)
    else:
        raise ValueError(f'Template không hỗ trợ import 3D: {template_id}')

    return _apply_markers_to_venue(venue, markers)


@transaction.atomic
def sync_organizer_concert_stage(concert: Concert) -> dict:
    """
    Venue = sân khấu vật lý (nhiều concert dùng chung).
    Concert = gán ConcertSeat theo desired_seat_count.
    """
    if not should_sync_stage_on_approval(concert):
        return {'skipped': True, 'reason': 'not_organizer_stage_concert'}

    template_id = concert.stage_template
    stage_result = sync_concert_stage_on_approval(concert)
    coords_updated = import_gltf_coordinates_for_venue(concert.venue, template_id)

    result = {
        'skipped': False,
        **stage_result,
        'coords_3d_updated': coords_updated,
    }
    logger.info('Stage sync concert %s: %s', concert.id, result)
    return result
