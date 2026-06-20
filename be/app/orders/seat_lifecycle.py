from django.db import transaction

from app.seats.models import ConcertSeat
from app.seats.reservation import hold_until, is_active_reservation, release_expired_reservations

from .models import Order, OrderItem


def release_order_seats(order: Order) -> int:
    """Trả ghế trong đơn về trống (hủy / thanh toán thất bại)."""
    count = 0
    for item in order.items.select_related('seat').all():
        updated = ConcertSeat.objects.filter(
            concert=order.concert,
            seat=item.seat,
        ).exclude(status='sold').update(
            status='available',
            reserved_until=None,
            reserved_by=None,
        )
        count += updated
    return count


def mark_order_seats_sold(order: Order) -> int:
    """Chỉ khi thanh toán thành công mới chuyển ghế sang đã bán."""
    count = 0
    for item in order.items.select_related('seat').all():
        updated = ConcertSeat.objects.filter(
            concert=order.concert,
            seat=item.seat,
        ).update(
            status='sold',
            reserved_until=None,
            reserved_by=None,
        )
        count += updated
    return count


def extend_order_reservations(order: Order) -> None:
    """Gia hạn giữ ghế trong lúc chờ thanh toán (không coi là đã bán)."""
    until = hold_until()
    seat_ids = list(order.items.values_list('seat_id', flat=True))
    if not seat_ids:
        return
    ConcertSeat.objects.filter(
        concert=order.concert,
        seat_id__in=seat_ids,
        reserved_by=order.user,
    ).update(reserved_until=until, status='reserved')


def cancel_stale_pending_orders(concert=None) -> int:
    """Hủy đơn pending khi ghế không còn được user giữ."""
    if concert is not None:
        release_expired_reservations(concert)

    qs = Order.objects.filter(status='pending').prefetch_related('items')
    if concert is not None:
        qs = qs.filter(concert=concert)

    cancelled = 0
    for order in qs:
        items = list(order.items.all())
        if not items:
            order.status = 'cancelled'
            order.save(update_fields=['status'])
            cancelled += 1
            continue

        still_held = True
        for item in items:
            try:
                cs = ConcertSeat.objects.get(concert=order.concert, seat=item.seat)
            except ConcertSeat.DoesNotExist:
                still_held = False
                break
            if cs.status == 'sold':
                still_held = False
                break
            if not is_active_reservation(cs) or cs.reserved_by_id != order.user_id:
                still_held = False
                break

        if not still_held:
            order.status = 'cancelled'
            order.save(update_fields=['status'])
            release_order_seats(order)
            cancelled += 1
    return cancelled


@transaction.atomic
def reconcile_concert_seats(concert) -> dict:
    """
    Đồng bộ trạng thái ghế theo đơn đã thanh toán.
    Chỉ ghế có OrderItem trong đơn paid mới được sold.
    """
    release_expired_reservations(concert)
    cancel_stale_pending_orders(concert)

    paid_seat_ids = set(
        OrderItem.objects.filter(
            order__concert=concert,
            order__status='paid',
        ).values_list('seat_id', flat=True)
    )

    reset_sold = ConcertSeat.objects.filter(
        concert=concert,
        status='sold',
    ).exclude(seat_id__in=paid_seat_ids).update(
        status='available',
        reserved_until=None,
        reserved_by=None,
    )

    marked_sold = 0
    if paid_seat_ids:
        marked_sold = ConcertSeat.objects.filter(
            concert=concert,
            seat_id__in=paid_seat_ids,
        ).update(
            status='sold',
            reserved_until=None,
            reserved_by=None,
        )

    return {
        'paid_seats': len(paid_seat_ids),
        'reset_sold': reset_sold,
        'marked_sold': marked_sold,
    }


def delete_user_orders(user) -> dict:
    """Xóa toàn bộ đơn của user và trả ghế về trống."""
    concert_ids = set()
    order_count = 0
    with transaction.atomic():
        for order in Order.objects.filter(user=user).prefetch_related('items'):
            concert_ids.add(order.concert_id)
            release_order_seats(order)
            order.delete()
            order_count += 1

    reconciled = {}
    for concert_id in concert_ids:
        from app.concerts.models import Concert

        concert = Concert.objects.get(id=concert_id)
        reconciled[str(concert_id)] = reconcile_concert_seats(concert)

    return {'orders_deleted': order_count, 'concerts_reconciled': reconciled}
