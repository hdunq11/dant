"""Áp template sân khấu cho venue organizer — không tạo concert mới."""
from __future__ import annotations

from django.db import transaction

from app.concerts.models import Concert
from app.seats.models import ConcertSeat, Seat, SeatZone
from app.seats.seat_grid import (
    DEFAULT_AISLE_AFTER,
    DEFAULT_SEATS_PER_ROW,
    DEFAULT_ZONE_ROWS,
    seat_pos_2d,
)
from app.seats.stage1_seat_grid import (
    STAGE1_SEATS_PER_ROW,
    STAGE1_TOTAL_SEATS,
    STAGE1_ZONE_ROWS,
    stage1_seat_pos_2d,
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
        'seat_count': STAGE1_TOTAL_SEATS,
    },
}


def _clear_venue_seats(venue: Venue) -> None:
    ConcertSeat.objects.filter(seat__venue=venue).delete()
    Seat.objects.filter(venue=venue).delete()
    SeatZone.objects.filter(venue=venue).delete()


def _create_zones(venue: Venue, zone_rows: dict[str, list[str]]) -> dict[str, SeatZone]:
    zones: dict[str, SeatZone] = {}
    for name in zone_rows:
        meta = DEFAULT_ZONE_META.get(name, {'price': 400_000, 'color': '#5b4dff'})
        zones[name] = SeatZone.objects.create(
            venue=venue,
            name=name,
            price=meta['price'],
            color=meta['color'],
        )
    return zones


def _create_auditorium_seats(venue: Venue, zones: dict[str, SeatZone], zone_rows: dict[str, list[str]]) -> int:
    created = 0
    for zone_name, row_labels in zone_rows.items():
        zone = zones[zone_name]
        for row_label in row_labels:
            row_idx = ord(row_label) - ord('A')
            for seat_num in range(1, DEFAULT_SEATS_PER_ROW + 1):
                pos_x, pos_y = seat_pos_2d(row_idx, seat_num, aisle_after=DEFAULT_AISLE_AFTER)
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
    return created


def _create_stage1_seats(venue: Venue, zones: dict[str, SeatZone], zone_rows: dict[str, list[str]]) -> int:
    created = 0
    for zone_name, row_labels in zone_rows.items():
        zone = zones[zone_name]
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
    return created


def _sync_concert_seats(venue: Venue) -> int:
    synced = 0
    for concert in Concert.objects.filter(venue=venue):
        ConcertSeat.objects.filter(concert=concert).delete()
        ConcertSeat.objects.bulk_create(
            [
                ConcertSeat(concert=concert, seat=seat, status='available')
                for seat in Seat.objects.filter(venue=venue).order_by('row_label', 'seat_number')
            ]
        )
        synced += 1
    return synced


@transaction.atomic
def apply_stage_template(venue: Venue, template_id: str) -> dict:
    template = STAGE_TEMPLATES.get(template_id)
    if not template:
        raise ValueError(f'Template không hợp lệ: {template_id}')

    zone_rows = template['zone_rows']
    _clear_venue_seats(venue)
    zones = _create_zones(venue, zone_rows)

    if template_id == STAGE_TEMPLATE_AUDITORIUM:
        seat_count = _create_auditorium_seats(venue, zones, zone_rows)
    else:
        seat_count = _create_stage1_seats(venue, zones, zone_rows)

    venue.model_glb_path = template['model_glb_path']
    venue.capacity = template['capacity']
    venue.save(update_fields=['model_glb_path', 'capacity', 'updated_at'])

    concerts_synced = _sync_concert_seats(venue)

    return {
        'template_id': template_id,
        'label': template['label'],
        'seat_count': seat_count,
        'zone_count': len(zones),
        'model_glb_path': venue.model_glb_path,
        'concerts_synced': concerts_synced,
    }


def serialize_venue_preview_seatmap(venue: Venue) -> dict:
    zones_payload = []
    for zone in venue.seat_zones.all().order_by('-price', 'name'):
        seats = Seat.objects.filter(venue=venue, zone=zone).order_by('row_label', 'seat_number')
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
