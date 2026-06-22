from decimal import Decimal

from app.concerts.models import Concert
from app.users.models import OrganizerProfile

from .models import Voucher

DELIVERY_PAPER_FEE = Decimal('30000')
INSURANCE_PER_SEAT = Decimal('50000')


def get_voucher_discount(seat_subtotal: Decimal, voucher_code: str | None) -> tuple[Decimal, str | None]:
    if not voucher_code:
        return Decimal('0'), None

    voucher = Voucher.objects.filter(code__iexact=voucher_code.strip(), is_active=True).first()
    if not voucher:
        return Decimal('0'), None

    discount = (seat_subtotal * voucher.discount_percent / Decimal('100')).quantize(Decimal('0.01'))
    return discount, voucher.code


def get_concert_service_fee_percent(concert: Concert) -> Decimal:
    """Phí dịch vụ (%) — ưu tiên mức riêng của concert, không thì lấy từ organizer."""
    if concert.service_fee_percent is not None:
        return Decimal(str(concert.service_fee_percent))
    if not concert.organizer_id:
        return Decimal('0')
    try:
        profile = concert.organizer.organizer_profile
    except OrganizerProfile.DoesNotExist:
        return Decimal('0')
    return Decimal(str(profile.service_fee_percent or 0))


def ticket_net_amount(seat_subtotal: Decimal, discount_amount: Decimal) -> Decimal:
    return max(seat_subtotal - discount_amount, Decimal('0'))


def calculate_platform_commission(
    concert: Concert,
    seat_subtotal: Decimal,
    discount_amount: Decimal,
) -> tuple[Decimal, Decimal]:
    """Chiết khấu admin trên doanh thu vé (sau voucher)."""
    fee_percent = get_concert_service_fee_percent(concert)
    ticket_net = ticket_net_amount(seat_subtotal, discount_amount)
    if fee_percent <= 0 or ticket_net <= 0:
        return Decimal('0'), fee_percent
    commission = (ticket_net * fee_percent / Decimal('100')).quantize(Decimal('0.01'))
    return commission, fee_percent


def resolve_order_platform_commission(order) -> Decimal:
    """Chiết khấu lưu trên đơn; tính lại nếu đơn cũ chưa có."""
    stored = Decimal(str(order.platform_commission or 0))
    if stored > 0:
        return stored
    comm, _ = calculate_platform_commission(
        order.concert,
        order.seat_subtotal,
        order.discount_amount,
    )
    return comm


def calculate_order_pricing(
    seat_subtotal: Decimal,
    seat_count: int,
    delivery_method: str = 'e_ticket',
    has_insurance: bool = False,
    voucher_code: str | None = None,
) -> dict:
    delivery_fee = DELIVERY_PAPER_FEE if delivery_method == 'paper' else Decimal('0')
    insurance_fee = INSURANCE_PER_SEAT * seat_count if has_insurance else Decimal('0')
    discount_amount, applied_voucher = get_voucher_discount(seat_subtotal, voucher_code)

    total_price = seat_subtotal + delivery_fee + insurance_fee - discount_amount
    if total_price < 0:
        total_price = Decimal('0')

    return {
        'seat_subtotal': seat_subtotal,
        'booking_fee': Decimal('0'),
        'delivery_fee': delivery_fee,
        'insurance_fee': insurance_fee,
        'discount_amount': discount_amount,
        'voucher_code': applied_voucher,
        'total_price': total_price.quantize(Decimal('0.01')),
    }
