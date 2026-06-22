"""Tính lại chiết khấu cho đơn đã thanh toán trước khi có platform_commission."""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import F

from app.orders.models import Order
from app.orders.pricing import calculate_platform_commission, ticket_net_amount


class Command(BaseCommand):
    help = 'Backfill platform_commission cho đơn paid (theo phí dịch vụ organizer hiện tại)'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        dry = options['dry_run']
        qs = Order.objects.filter(status='paid').select_related('concert', 'concert__organizer__organizer_profile')
        updated = 0
        total_comm = Decimal('0')

        for order in qs:
            comm, snap = calculate_platform_commission(
                order.concert,
                order.seat_subtotal,
                order.discount_amount,
            )
            if comm <= 0 and order.platform_commission <= 0:
                continue
            if order.platform_commission == comm and order.service_fee_percent_snapshot == snap:
                continue

            ticket_net = ticket_net_amount(order.seat_subtotal, order.discount_amount)
            self.stdout.write(
                f'  {order.id} | {order.concert.title} | ticket {ticket_net} | '
                f'{snap}% -> {comm} (was {order.platform_commission})'
            )
            if not dry:
                order.platform_commission = comm
                order.service_fee_percent_snapshot = snap
                order.save(update_fields=['platform_commission', 'service_fee_percent_snapshot', 'updated_at'])
            updated += 1
            total_comm += comm

        self.stdout.write(self.style.SUCCESS(
            f'{"[dry-run] " if dry else ""}Updated {updated} orders · commission total {total_comm}'
        ))
