from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from app.concerts.models import Concert
from app.concerts.serializers import ConcertSerializer
from app.orders.models import Order, OrderItem, Voucher
from app.users.models import User, OrganizerProfile
from app.venues.models import Venue

from .permissions import IsPlatformAdmin
from .serializers import AdminUserSerializer, AdminUserUpdateSerializer, OrganizerRejectSerializer


class AdminDashboardView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        paid = Order.objects.filter(status='paid')
        return Response({
            'users_total': User.objects.count(),
            'organizers_pending': OrganizerProfile.objects.filter(status='pending').count(),
            'concerts_pending_review': Concert.objects.filter(status='pending_review').count(),
            'concerts_published': Concert.objects.filter(status='published').count(),
            'venues_total': Venue.objects.count(),
            'orders_total': Order.objects.count(),
            'orders_paid': paid.count(),
            'revenue_total': float(paid.aggregate(t=Sum('total_price'))['t'] or 0),
            'vouchers_active': Voucher.objects.filter(is_active=True).count(),
        })


class AdminReportsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        orders_by_status = {
            row['status']: row['c']
            for row in Order.objects.values('status').annotate(c=Count('id'))
        }
        concerts_by_status = {
            row['status']: row['c']
            for row in Concert.objects.values('status').annotate(c=Count('id'))
        }
        organizers_by_status = {
            row['status']: row['c']
            for row in OrganizerProfile.objects.values('status').annotate(c=Count('id'))
        }
        top_concerts = []
        for c in Concert.objects.all().order_by('-start_time')[:15]:
            paid = Order.objects.filter(concert=c, status='paid')
            top_concerts.append({
                'concert_id': str(c.id),
                'title': c.title,
                'status': c.status,
                'event_source': c.event_source,
                'orders': paid.count(),
                'revenue': float(paid.aggregate(t=Sum('total_price'))['t'] or 0),
                'tickets_sold': OrderItem.objects.filter(order__concert=c, order__status='paid').count(),
            })
        top_concerts.sort(key=lambda x: x['revenue'], reverse=True)
        return Response({
            'orders_by_status': orders_by_status,
            'concerts_by_status': concerts_by_status,
            'organizers_by_status': organizers_by_status,
            'top_concerts': top_concerts[:10],
            'users_by_role': {
                row['role']: row['c']
                for row in User.objects.values('role').annotate(c=Count('id'))
            },
        })


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsPlatformAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = User.objects.all().select_related('organizer_profile').order_by('-created_at')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        organizer_status = self.request.query_params.get('organizer_status')
        if organizer_status:
            qs = qs.filter(organizer_profile__status=organizer_status)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(full_name__icontains=search))
        return qs

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update'):
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({'error': 'Không thể xóa chính mình.'}, status=400)
        return super().destroy(request, *args, **kwargs)


class AdminOrganizerViewSet(viewsets.ViewSet):
    permission_classes = [IsPlatformAdmin]

    def _profile(self, pk):
        return OrganizerProfile.objects.select_related('user').get(pk=pk)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        try:
            profile = self._profile(pk)
        except OrganizerProfile.DoesNotExist:
            return Response({'error': 'Không tìm thấy hồ sơ.'}, status=404)
        profile.status = 'approved'
        profile.reviewed_by = request.user
        profile.reviewed_at = timezone.now()
        profile.rejection_reason = ''
        profile.save()
        profile.user.role = 'organizer'
        profile.user.save(update_fields=['role'])
        return Response(AdminUserSerializer(profile.user).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        ser = OrganizerRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            profile = self._profile(pk)
        except OrganizerProfile.DoesNotExist:
            return Response({'error': 'Không tìm thấy hồ sơ.'}, status=404)
        profile.status = 'rejected'
        profile.reviewed_by = request.user
        profile.reviewed_at = timezone.now()
        profile.rejection_reason = ser.validated_data.get('rejection_reason', '')
        profile.save()
        return Response(AdminUserSerializer(profile.user).data)


class AdminConcertReviewViewSet(viewsets.ViewSet):
    permission_classes = [IsPlatformAdmin]

    def _concert(self, pk):
        return Concert.objects.prefetch_related('concert_artists__artist', 'venue').get(pk=pk)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        try:
            concert = self._concert(pk)
        except Concert.DoesNotExist:
            return Response({'error': 'Concert không tồn tại.'}, status=404)
        if concert.status != 'pending_review':
            return Response({'error': 'Concert không ở trạng thái chờ duyệt.'}, status=400)
        concert.status = 'approved'
        concert.save(update_fields=['status', 'updated_at'])
        return Response(ConcertSerializer(concert).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        try:
            concert = self._concert(pk)
        except Concert.DoesNotExist:
            return Response({'error': 'Concert không tồn tại.'}, status=404)
        if concert.status != 'pending_review':
            return Response({'error': 'Concert không ở trạng thái chờ duyệt.'}, status=400)
        concert.status = 'rejected'
        concert.save(update_fields=['status', 'updated_at'])
        return Response(ConcertSerializer(concert).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        try:
            concert = self._concert(pk)
        except Concert.DoesNotExist:
            return Response({'error': 'Concert không tồn tại.'}, status=404)
        if concert.status != 'approved':
            return Response({'error': 'Chỉ publish concert đã duyệt.'}, status=400)
        concert.status = 'published'
        concert.save(update_fields=['status', 'updated_at'])
        return Response(ConcertSerializer(concert).data)
