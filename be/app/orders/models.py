import uuid
from django.db import models
from app.users.models import User
from app.concerts.models import Concert
from app.seats.models import Seat


class Voucher(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.CharField(max_length=255, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vouchers'
        ordering = ['code']

    def __str__(self):
        return f'{self.code} (-{self.discount_percent}%)'


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    DELIVERY_CHOICES = [
        ('e_ticket', 'E-Ticket'),
        ('paper', 'Paper Ticket'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    concert = models.ForeignKey(Concert, on_delete=models.CASCADE, related_name='orders')
    seat_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    booking_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    insurance_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_fee_percent_snapshot = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    voucher_code = models.CharField(max_length=50, blank=True, null=True)
    delivery_method = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default='e_ticket')
    has_insurance = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=30, blank=True, default='momo')
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, default='')
    paypal_order_id = models.CharField(max_length=255, blank=True, default='')
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.id} - {self.user.email}"


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"OrderItem {self.id} - {self.seat}"
