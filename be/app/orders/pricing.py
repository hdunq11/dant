from decimal import Decimal

from .models import Voucher

BOOKING_FEE = Decimal('20000')
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


def calculate_order_pricing(
    seat_subtotal: Decimal,
    seat_count: int,
    delivery_method: str = 'e_ticket',
    has_insurance: bool = False,
    voucher_code: str | None = None,
) -> dict:
    booking_fee = BOOKING_FEE
    delivery_fee = DELIVERY_PAPER_FEE if delivery_method == 'paper' else Decimal('0')
    insurance_fee = INSURANCE_PER_SEAT * seat_count if has_insurance else Decimal('0')
    discount_amount, applied_voucher = get_voucher_discount(seat_subtotal, voucher_code)

    total_price = seat_subtotal + booking_fee + delivery_fee + insurance_fee - discount_amount
    if total_price < 0:
        total_price = Decimal('0')

    return {
        'seat_subtotal': seat_subtotal,
        'booking_fee': booking_fee,
        'delivery_fee': delivery_fee,
        'insurance_fee': insurance_fee,
        'discount_amount': discount_amount,
        'voucher_code': applied_voucher,
        'total_price': total_price.quantize(Decimal('0.01')),
    }
