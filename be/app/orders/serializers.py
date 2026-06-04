from rest_framework import serializers
from .models import Order, OrderItem, Voucher
from app.seats.serializers import SeatSerializer


class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = ('id', 'code', 'discount_percent', 'description', 'is_active')


class VoucherValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    seat_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class OrderItemSerializer(serializers.ModelSerializer):
    seat = SeatSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'seat', 'price', 'created_at')
        read_only_fields = ('id', 'created_at')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(read_only=True, many=True)
    concert_title = serializers.CharField(source='concert.title', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'user', 'concert', 'concert_title', 'seat_subtotal', 'booking_fee',
            'delivery_fee', 'insurance_fee', 'discount_amount', 'voucher_code',
            'delivery_method', 'has_insurance', 'payment_method', 'total_price',
            'status', 'items', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class OrderCreateSerializer(serializers.Serializer):
    concert_id = serializers.UUIDField()
    seat_ids = serializers.ListField(child=serializers.UUIDField())
    voucher_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    delivery_method = serializers.ChoiceField(choices=['e_ticket', 'paper'], default='e_ticket')
    has_insurance = serializers.BooleanField(default=False)
    payment_method = serializers.CharField(max_length=30, required=False, default='momo')
