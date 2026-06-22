"""Áp template sân khấu — theo concert (organizer) hoặc venue (legacy setup)."""
from __future__ import annotations

from django.db import transaction

from app.concerts.models import Concert
from app.seats.models import ConcertSeat, Seat, SeatZone
from app.seats.seat_grid import (
    DEFAULT_AISLE_AFTER,
    DEFAULT_ZONE_ROWS,
    iter_auditorium_seats_by_row,
    seat_pos_2d,
    zones_used_for_auditorium,
)
from app.seats.stage1_seat_grid import (
    STAGE1_ZONE_ROWS,
    iter_stage1_seats_by_row,
    stage1_seat_pos_2d,
    zones_used_for_stage1,
)
from app.venues.models import Venue

STAGE_TEMPLATE_AUDITORIUM = 'auditorium_336'
STAGE_TEMPLATE_STAGE1 = 'stage1_1000'

DEFAULT_ZONE_META: dict[str, dict] = {
    'VIP': {'price': 1_200_000, 'color': '#eab308'},
    'A': {'price': 900_000, 'color': '#5b4dff'},
    'B': {'price': 700_000, 'color': '#0ea5e9'},
    'C': {'price': 500_000, 'color': '#22c55e'},
    'Standard': {'price': 350_000, 'color': '#94a3b8'},
}

STAGE_TEMPLATES: dict[str, dict] = {
    STAGE_TEMPLATE_AUDITORIUM: {
        'label': 'Hội trường 336 ghế',
        'description': 'Giống BELOVED — 12 hàng × 28 ghế, 1 khán đài.',
        'model_glb_path': 'models/venue_stage_1/scene.gltf',
        'capacity': 336,
        'zone_rows': DEFAULT_ZONE_ROWS,
        'seat_count': 336,
    },
    STAGE_TEMPLATE_STAGE1: {
        'label': 'Sân khấu 1000 ghế',
        'description': 'Giống ALL-ROUNDER — 2 khối 500 ghế, lối đi giữa.',
        'model_glb_path': 'models/stage_1/scene.gltf',
        'capacity': 1000,
        'zone_rows': STAGE1_ZONE_ROWS,
        'seat_count': 1000,
    },
}


def get_stage_template(template_id: str) -> dict:
    template = STAGE_TEMPLATES.get(template_id)
    if not template:
        raise ValueError(f'Template không hợp lệ: {template_id}')
    return template


def validate_desired_seat_count(template_id: str, desired: int) -> None:
    template = get_stage_template(template_id)
    max_seats = template['seat_count']
    if desired < 1:
        raise ValueError('Số ghế mong muốn phải >= 1.')
    if desired > max_seats:
        raise ValueError(
            f'Sân khấu {template["label"]} chỉ có tối đa {max_seats} ghế.'
        )


def concert_uses_own_seats(concert: Concert) -> bool:
    """Legacy — ghế theo concert_id (đã bỏ). Dùng ghế venue + ConcertSeat."""
    return Seat.objects.filter(concert=concert).exists()


def venue_physical_seats(venue: Venue):
    return Seat.objects.filter(venue=venue, concert__isnull=True).select_related('zone')


def _ordered_physical_seats(venue: Venue, template_id: str) -> list[Seat]:
    from app.seats.seat_grid import global_seat_number
    from app.seats.stage1_seat_grid import stage1_global_seat_number

    seats = list(venue_physical_seats(venue))
    if template_id == STAGE_TEMPLATE_AUDITORIUM:
        seats.sort(key=lambda s: global_seat_number(s.row_label, s.seat_number) or 10**9)
    else:
        seats.sort(key=lambda s: stage1_global_seat_number(s.row_label, s.seat_number) or 10**9)
    return seats


def _purge_concert_scoped_seats(concert: Concert) -> None:
    """Dọn data model cũ (ghế duplicate theo concert) nếu có."""
    Seat.objects.filter(concert=concert).delete()
    SeatZone.objects.filter(concert=concert).delete()


@transaction.atomic
def ensure_venue_stage_grid(venue: Venue, template_id: str) -> dict:
    """
    Đảm bảo venue có lưới ghế vật lý đủ template (336/1000).
    Không xóa ghế đã có — nhiều concert cùng venue dùng chung sân khấu.
    """
    template = get_stage_template(template_id)
    zone_rows = template['zone_rows']
    existing = venue_physical_seats(venue).count()

    if existing > 0:
        if not venue.model_glb_path:
            venue.model_glb_path = template['model_glb_path']
            venue.save(update_fields=['model_glb_path', 'updated_at'])
        return {
            'created': 0,
            'existing': existing,
            'template_id': template_id,
            'model_glb_path': venue.model_glb_path,
        }

    zones = _create_zones(venue, zone_rows, only=set(zone_rows.keys()))
    if template_id == STAGE_TEMPLATE_AUDITORIUM:
        created = _create_auditorium_seats(venue, zones, zone_rows, limit=None)
    else:
        created = _create_stage1_seats(venue, zones, zone_rows, limit=None)

    venue.model_glb_path = template['model_glb_path']
    venue.capacity = template['capacity']
    venue.save(update_fields=['model_glb_path', 'capacity', 'updated_at'])

    return {
        'created': created,
        'existing': 0,
        'template_id': template_id,
        'model_glb_path': venue.model_glb_path,
    }


@transaction.atomic
def assign_concert_seats(concert: Concert) -> int:
    """
    Gắn ghế venue vào concert — chỉ ConcertSeat của concert này.
    Mỗi concert chọn desired_seat_count ghế (28/hàng hoặc 50/hàng).
    """
    template_id = concert.stage_template
    desired = concert.desired_seat_count
    if not template_id or not desired:
        raise ValueError('Concert thiếu stage_template hoặc desired_seat_count.')
    validate_desired_seat_count(template_id, desired)

    _purge_concert_scoped_seats(concert)
    ConcertSeat.objects.filter(concert=concert).delete()

    ordered = _ordered_physical_seats(concert.venue, template_id)
    if len(ordered) < desired:
        raise ValueError(
            f'Venue chỉ có {len(ordered)} ghế vật lý, concert cần {desired}.'
        )

    picked = ordered[:desired]
    ConcertSeat.objects.bulk_create(
        [ConcertSeat(concert=concert, seat=seat, status='available') for seat in picked]
    )
    return len(picked)


@transaction.atomic
def sync_concert_stage_on_approval(concert: Concert) -> dict:
    """Duyệt concert: đảm bảo sân khấu venue + gán ghế cho concert này."""
    template_id = concert.stage_template
    desired = concert.desired_seat_count
    if not template_id or not desired:
        raise ValueError('Concert thiếu stage_template hoặc desired_seat_count.')

    template = get_stage_template(template_id)
    venue_result = ensure_venue_stage_grid(concert.venue, template_id)
    concert_seats = assign_concert_seats(concert)

    return {
        'concert_id': str(concert.id),
        'venue_id': str(concert.venue_id),
        'template_id': template_id,
        'label': template['label'],
        'desired_seat_count': desired,
        'seats_per_row': 28 if template_id == STAGE_TEMPLATE_AUDITORIUM else 50,
        'venue_seats_created': venue_result['created'],
        'venue_seats_existing': venue_result['existing'],
        'concert_seats': concert_seats,
        'model_glb_path': concert.venue.model_glb_path,
    }


def _clear_venue_seats(venue: Venue) -> None:
    """Legacy: xóa ghế venue-level (concert=null) — dùng setup command."""
    ConcertSeat.objects.filter(seat__venue=venue, seat__concert__isnull=True).delete()
    Seat.objects.filter(venue=venue, concert__isnull=True).delete()
    SeatZone.objects.filter(venue=venue, concert__isnull=True).delete()


def _clear_concert_stage(concert: Concert) -> None:
    """Xóa sơ đồ riêng của concert — không đụng ghế venue/concert khác."""
    ConcertSeat.objects.filter(concert=concert).delete()
    Seat.objects.filter(concert=concert).delete()
    SeatZone.objects.filter(concert=concert).delete()


def _create_zones(
    venue: Venue,
    zone_rows: dict[str, list[str]],
    *,
    concert: Concert | None = None,
    only: set[str] | None = None,
) -> dict[str, SeatZone]:
    zones: dict[str, SeatZone] = {}
    for name in zone_rows:
        if only is not None and name not in only:
            continue
        meta = DEFAULT_ZONE_META.get(name, {'price': 400_000, 'color': '#5b4dff'})
        zones[name] = SeatZone.objects.create(
            venue=venue,
            concert=concert,
            name=name,
            price=meta['price'],
            color=meta['color'],
        )
    return zones


def _create_auditorium_seats(
    venue: Venue,
    zones: dict[str, SeatZone],
    zone_rows: dict[str, list[str]],
    *,
    concert: Concert | None = None,
    limit: int | None = None,
) -> int:
    created = 0
    for zone_name, row_label, row_idx, seat_num in iter_auditorium_seats_by_row(
        zone_rows, limit=limit
    ):
        zone = zones[zone_name]
        pos_x, pos_y = seat_pos_2d(row_idx, seat_num, aisle_after=DEFAULT_AISLE_AFTER)
        Seat.objects.create(
            venue=venue,
            concert=concert,
            zone=zone,
            row_label=row_label,
            seat_number=seat_num,
            pos_x=pos_x,
            pos_y=pos_y,
            pos_z=0.0,
        )
        created += 1
    return created


def _create_stage1_seats(
    venue: Venue,
    zones: dict[str, SeatZone],
    zone_rows: dict[str, list[str]],
    *,
    concert: Concert | None = None,
    limit: int | None = None,
) -> int:
    created = 0
    for zone_name, row_label, row_idx, seat_num in iter_stage1_seats_by_row(
        zone_rows, limit=limit
    ):
        zone = zones[zone_name]
        pos_x, pos_y = stage1_seat_pos_2d(row_idx, seat_num)
        Seat.objects.create(
            venue=venue,
            concert=concert,
            zone=zone,
            row_label=row_label,
            seat_number=seat_num,
            pos_x=pos_x,
            pos_y=pos_y,
            pos_z=0.0,
        )
        created += 1
    return created


def _link_concert_seats(concert: Concert) -> int:
    raise NotImplementedError('Dùng assign_concert_seats(concert) thay thế.')


@transaction.atomic
def apply_stage_template_to_concert(concert: Concert) -> dict:
    """Deprecated — dùng sync_concert_stage_on_approval."""
    return sync_concert_stage_on_approval(concert)


@transaction.atomic
def apply_stage_template(
    venue: Venue,
    template_id: str,
    desired_seat_count: int | None = None,
) -> dict:
    """Legacy: sinh ghế venue-level (setup_auditorium_grid / stage1_grid)."""
    template = STAGE_TEMPLATES.get(template_id)
    if not template:
        raise ValueError(f'Template không hợp lệ: {template_id}')

    if desired_seat_count is not None:
        validate_desired_seat_count(template_id, desired_seat_count)

    zone_rows = template['zone_rows']
    _clear_venue_seats(venue)
    limit = desired_seat_count
    if template_id == STAGE_TEMPLATE_AUDITORIUM:
        zones_needed = zones_used_for_auditorium(zone_rows, limit)
    else:
        zones_needed = zones_used_for_stage1(zone_rows, limit)
    zones = _create_zones(venue, zone_rows, only=zones_needed)

    if template_id == STAGE_TEMPLATE_AUDITORIUM:
        seat_count = _create_auditorium_seats(venue, zones, zone_rows, limit=limit)
    else:
        seat_count = _create_stage1_seats(venue, zones, zone_rows, limit=limit)

    venue.model_glb_path = template['model_glb_path']
    venue.capacity = desired_seat_count if desired_seat_count is not None else template['capacity']
    venue.save(update_fields=['model_glb_path', 'capacity', 'updated_at'])

    return {
        'template_id': template_id,
        'label': template['label'],
        'seat_count': seat_count,
        'zone_count': len(zones),
        'model_glb_path': venue.model_glb_path,
    }


def serialize_concert_preview_seatmap(concert: Concert) -> dict:
    zones_payload = []
    if concert_uses_own_seats(concert):
        zones_qs = SeatZone.objects.filter(concert=concert).order_by('-price', 'name')
        seats_filter = {'concert': concert}
    else:
        zones_qs = SeatZone.objects.filter(venue=concert.venue, concert__isnull=True).order_by(
            '-price', 'name'
        )
        seats_filter = {'venue': concert.venue, 'concert__isnull': True}

    for zone in zones_qs:
        seats = Seat.objects.filter(zone=zone, **seats_filter).order_by('row_label', 'seat_number')
        zones_payload.append({
            'zone_id': str(zone.id),
            'name': zone.name,
            'price': float(zone.price),
            'color': zone.color,
            'seats': [
                {
                    'seat_id': str(seat.id),
                    'row': seat.row_label,
                    'number': seat.seat_number,
                    'status': 'available',
                    'pos_x': seat.pos_x,
                    'pos_y': seat.pos_y,
                    'pos_z': seat.pos_z,
                    'selectable': True,
                    'reserved_by_me': False,
                }
                for seat in seats
            ],
        })
    return {
        'concert_id': str(concert.id),
        'venue_id': str(concert.venue_id),
        'venue_name': concert.venue.name,
        'model_glb_path': concert.venue.model_glb_path,
        'zones': zones_payload,
    }


def serialize_venue_preview_seatmap(venue: Venue) -> dict:
    zones_payload = []
    for zone in venue.seat_zones.filter(concert__isnull=True).order_by('-price', 'name'):
        seats = Seat.objects.filter(venue=venue, zone=zone, concert__isnull=True).order_by(
            'row_label', 'seat_number'
        )
        zones_payload.append({
            'zone_id': str(zone.id),
            'name': zone.name,
            'price': float(zone.price),
            'color': zone.color,
            'seats': [
                {
                    'seat_id': str(seat.id),
                    'row': seat.row_label,
                    'number': seat.seat_number,
                    'status': 'available',
                    'pos_x': seat.pos_x,
                    'pos_y': seat.pos_y,
                    'pos_z': seat.pos_z,
                    'selectable': True,
                    'reserved_by_me': False,
                }
                for seat in seats
            ],
        })
    return {
        'venue_id': str(venue.id),
        'venue_name': venue.name,
        'model_glb_path': venue.model_glb_path,
        'zones': zones_payload,
    }
