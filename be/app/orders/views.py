from django.conf import settings
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from decimal import Decimal
from .models import Order, OrderItem, Voucher
from .payments import (
    PayPalNotConfiguredError,
    capture_and_verify_paypal_order,
    create_paypal_order_for_order,
)
from .serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    VoucherValidateSerializer,
    VoucherSerializer,
)
from .pricing import calculate_order_pricing, get_voucher_discount
from app.seats.reservation import effective_seat_status, is_active_reservation, release_expired_reservations
from app.concerts.models import Concert
from app.seats.models import ConcertSeat, Seat
from .seat_lifecycle import (
    cancel_stale_pending_orders,
    extend_order_reservations,
    mark_order_seats_sold,
    release_order_seats,
)


def _finalize_paypal_payment(order: Order, paypal_order_id: str) -> Response:
    if order.status == 'paid':
        return Response(
            {'message': 'Payment successful', 'order': OrderSerializer(order).data},
            status=status.HTTP_200_OK,
        )

    if order.status != 'pending':
        return Response({'error': 'Order is not pending'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        is_valid, error_message = capture_and_verify_paypal_order(order, paypal_order_id)
    except PayPalNotConfiguredError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        return Response(
            {'error': f'Xác minh thanh toán thất bại: {exc}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if not is_valid:
        return Response({'error': error_message}, status=status.HTTP_400_BAD_REQUEST)

    order.paypal_order_id = paypal_order_id
    order.payment_method = 'paypal'
    order.status = 'paid'
    order.save()

    mark_order_seats_sold(order)

    return Response(
        {'message': 'Payment successful', 'order': OrderSerializer(order).data},
        status=status.HTTP_200_OK,
    )


class PaymentConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        enabled = bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)
        return Response({
            'enabled': enabled,
            'client_id': settings.PAYPAL_CLIENT_ID if enabled else '',
            'provider': 'paypal_sandbox',
            'currency': settings.PAYPAL_CURRENCY,
        })


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


class PayPalCompleteView(APIView):
    """Hoàn tất thanh toán sau redirect PayPal — tìm đơn theo token PayPal."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        paypal_order_id = request.data.get('token') or request.data.get('paypal_order_id')
        order_id = request.data.get('order_id')

        if not paypal_order_id:
            return Response({'error': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

        order = None
        if order_id:
            order = Order.objects.filter(id=order_id, user=request.user).first()
        if order is None:
            order = Order.objects.filter(
                paypal_order_id=paypal_order_id,
                user=request.user,
            ).first()
        if order is None:
            return Response(
                {'error': 'Không tìm thấy đơn hàng cho phiên PayPal này'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return _finalize_paypal_payment(order, paypal_order_id)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.select_related('concert', 'user').prefetch_related('items')
        if self.request.user.is_staff or getattr(self.request.user, 'role', '') == 'admin':
            return qs.order_by('-created_at')
        return qs.filter(user=self.request.user).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'pay', 'cancel', 'create_paypal_order']:
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

        release_expired_reservations(concert)
        cancel_stale_pending_orders(concert)

        seat_subtotal = Decimal('0')
        concert_seats = []

        for seat_id in seat_ids:
            try:
                seat = Seat.objects.select_related('zone').get(id=seat_id)
                concert_seat = ConcertSeat.objects.get(concert=concert, seat=seat)

                if not is_active_reservation(concert_seat):
                    return Response(
                        {'error': f'Seat {seat_id} reservation expired or not held'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if concert_seat.reserved_by_id != request.user.id:
                    return Response(
                        {'error': f'Seat {seat_id} is held by another user'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if effective_seat_status(concert_seat) == 'sold':
                    return Response(
                        {'error': f'Seat {seat_id} is already sold'},
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

        extend_order_reservations(order)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def create_paypal_order(self, request, pk=None):
        order = self.get_object()

        if order.user_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to pay this order'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != 'pending':
            return Response({'error': 'Order is not pending'}, status=status.HTTP_400_BAD_REQUEST)

        return_url = request.data.get('return_url')
        cancel_url = request.data.get('cancel_url')

        try:
            paypal_order = create_paypal_order_for_order(order, return_url, cancel_url)
        except PayPalNotConfiguredError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:
            order.paypal_order_id = ''
            order.save(update_fields=['paypal_order_id'])
            return Response(
                {'error': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        order.paypal_order_id = paypal_order.get('id', '')
        order.payment_method = 'paypal'
        order.save(update_fields=['paypal_order_id', 'payment_method'])

        return Response({
            'paypal_order_id': paypal_order.get('id'),
            'client_id': settings.PAYPAL_CLIENT_ID,
            'approval_url': paypal_order.get('approval_url'),
            'amount': float(order.total_price),
            'currency': settings.PAYPAL_CURRENCY,
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def pay(self, request, pk=None):
        order = self.get_object()

        if order.user_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to pay this order'},
                status=status.HTTP_403_FORBIDDEN,
            )

        paypal_order_id = request.data.get('paypal_order_id') or order.paypal_order_id
        if not paypal_order_id:
            return Response(
                {'error': 'paypal_order_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return _finalize_paypal_payment(order, paypal_order_id)

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

        if order.status == 'paid':
            return Response({'error': 'Cannot cancel a paid order'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'cancelled'
        order.save()
        release_order_seats(order)

        return Response({'message': 'Order cancelled'}, status=status.HTTP_200_OK)
