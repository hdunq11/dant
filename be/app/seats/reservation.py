from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import ConcertSeat

User = get_user_model()
HOLD_MINUTES = 10


def release_expired_reservations(concert=None):
    """Trả ghế reserved hết hạn về available."""
    qs = ConcertSeat.objects.filter(
        status='reserved',
        reserved_until__lt=timezone.now(),
    )
    if concert is not None:
        qs = qs.filter(concert=concert)
    return qs.update(status='available', reserved_until=None, reserved_by=None)


def hold_until():
    return timezone.now() + timedelta(minutes=HOLD_MINUTES)


def is_seat_selectable(concert_seat: ConcertSeat, user) -> bool:
    if concert_seat.status == 'sold':
        return False
    if concert_seat.status == 'available':
        return True
    if concert_seat.status == 'reserved':
        if concert_seat.reserved_until and concert_seat.reserved_until < timezone.now():
            return True
        if user and getattr(user, 'is_authenticated', False):
            return concert_seat.reserved_by_id == user.id
        return False
    return False


def serialize_map_seat(concert_seat: ConcertSeat, user) -> dict:
    seat = concert_seat.seat
    reserved_by_me = (
        concert_seat.status == 'reserved'
        and user
        and getattr(user, 'is_authenticated', False)
        and concert_seat.reserved_by_id == user.id
    )
    return {
        'seat_id': str(seat.id),
        'row': seat.row_label,
        'number': seat.seat_number,
        'status': concert_seat.status,
        'selectable': is_seat_selectable(concert_seat, user),
        'reserved_by_me': reserved_by_me,
        'pos_x': seat.pos_x,
        'pos_y': seat.pos_y,
        'pos_z': seat.pos_z,
    }


def release_user_reservations(concert, user):
    """Hủy giữ chỗ của user cho concert (timeout hoặc rời checkout)."""
    if not user or not getattr(user, 'is_authenticated', False):
        return 0
    qs = ConcertSeat.objects.filter(
        concert=concert,
        status='reserved',
        reserved_by=user,
    )
    return qs.update(status='available', reserved_until=None, reserved_by=None)
