from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from decimal import Decimal
from .models import Order, OrderItem, Voucher
from .serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    VoucherValidateSerializer,
    VoucherSerializer,
)
from .pricing import calculate_order_pricing, get_voucher_discount
from app.concerts.models import Concert
from app.seats.models import ConcertSeat, Seat


class VoucherValidateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VoucherValidateSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        seat_subtotal = serializer.validated_data['seat_subtotal']
        discount_amount, applied_code = get_voucher_discount(seat_subtotal, code)

        if not applied_code:
            return Response(
                {'valid': False, 'error': 'Mã giảm giá không hợp lệ hoặc đã hết hạn'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        voucher = Voucher.objects.get(code__iexact=applied_code)
        return Response({
            'valid': True,
            'code': voucher.code,
            'discount_percent': float(voucher.discount_percent),
            'discount_amount': float(discount_amount),
            'description': voucher.description,
        })


class VoucherListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VoucherSerializer
    queryset = Voucher.objects.filter(is_active=True)


class VoucherAdminViewSet(viewsets.ModelViewSet):
    queryset = Voucher.objects.all().order_by('code')
    serializer_class = VoucherSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAdminUser()]
        return [IsAdminUser()]


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.select_related('concert', 'user').prefetch_related('items')
        if self.request.user.is_staff or getattr(self.request.user, 'role', '') == 'admin':
            return qs.order_by('-created_at')
        return qs.filter(user=self.request.user).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'pay', 'cancel']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        concert_id = data['concert_id']
        seat_ids = data['seat_ids']
        voucher_code = data.get('voucher_code') or None
        if voucher_code == '':
            voucher_code = None

        try:
            concert = Concert.objects.get(id=concert_id)
        except Concert.DoesNotExist:
            return Response({'error': 'Concert not found'}, status=status.HTTP_404_NOT_FOUND)

        seat_subtotal = Decimal('0')
        concert_seats = []

        for seat_id in seat_ids:
            try:
                seat = Seat.objects.select_related('zone').get(id=seat_id)
                concert_seat = ConcertSeat.objects.get(concert=concert, seat=seat)

                if concert_seat.status != 'reserved':
                    return Response(
                        {'error': f'Seat {seat_id} is not reserved'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                concert_seats.append((concert_seat, seat))
                seat_subtotal += seat.zone.price
            except (Seat.DoesNotExist, ConcertSeat.DoesNotExist):
                return Response(
                    {'error': f'Seat {seat_id} not found'},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if voucher_code:
            _, applied = get_voucher_discount(seat_subtotal, voucher_code)
            if not applied:
                return Response(
                    {'error': 'Mã giảm giá không hợp lệ hoặc đã hết hạn'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        pricing = calculate_order_pricing(
            seat_subtotal=seat_subtotal,
            seat_count=len(seat_ids),
            delivery_method=data.get('delivery_method', 'e_ticket'),
            has_insurance=data.get('has_insurance', False),
            voucher_code=voucher_code,
        )

        order = Order.objects.create(
            user=request.user,
            concert=concert,
            seat_subtotal=pricing['seat_subtotal'],
            booking_fee=pricing['booking_fee'],
            delivery_fee=pricing['delivery_fee'],
            insurance_fee=pricing['insurance_fee'],
            discount_amount=pricing['discount_amount'],
            voucher_code=pricing['voucher_code'],
            delivery_method=data.get('delivery_method', 'e_ticket'),
            has_insurance=data.get('has_insurance', False),
            payment_method=data.get('payment_method', 'momo'),
            total_price=pricing['total_price'],
            status='pending',
        )

        for concert_seat, seat in concert_seats:
            OrderItem.objects.create(
                order=order,
                seat=seat,
                price=seat.zone.price,
            )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def pay(self, request, pk=None):
        order = self.get_object()

        if order.user_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to pay this order'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != 'pending':
            return Response({'error': 'Order is not pending'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'paid'
        order.save()

        for item in order.items.all():
            concert_seat = ConcertSeat.objects.get(concert=order.concert, seat=item.seat)
            concert_seat.status = 'sold'
            concert_seat.reserved_until = None
            concert_seat.save()

        return Response(
            {'message': 'Payment successful', 'order': OrderSerializer(order).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = self.get_object()

        if order.user_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to cancel this order'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status == 'cancelled':
            return Response({'error': 'Order is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'cancelled'
        order.save()

        for item in order.items.all():
            concert_seat = ConcertSeat.objects.get(concert=order.concert, seat=item.seat)
            if concert_seat.status in ('reserved', 'sold'):
                concert_seat.status = 'available'
                concert_seat.reserved_until = None
                concert_seat.save()

        return Response({'message': 'Order cancelled'}, status=status.HTTP_200_OK)
