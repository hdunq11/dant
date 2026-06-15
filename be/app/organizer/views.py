from django.db.models import Count, Sum, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from app.artists.models import Artist
from app.artists.serializers import ArtistSerializer
from app.concerts.models import Concert
from app.orders.models import Order, OrderItem
from app.seats.models import ConcertSeat, Seat, SeatZone
from app.seats.reservation import release_expired_reservations, serialize_map_seat
from app.seats.seat_grid import (
    DEFAULT_AISLE_AFTER,
    DEFAULT_SEATS_PER_ROW,
    default_row_labels,
    seat_pos_2d,
)
from app.venues.models import Venue

from .permissions import IsApprovedOrganizer
from .serializers import OrganizerConcertSerializer, OrganizerVenueSerializer
from app.seats.serializers import SeatZoneSerializer


def _user_concerts(user):
    return Concert.objects.filter(organizer=user).prefetch_related('concert_artists__artist', 'venue')


def _owned_venue(user, venue_id):
    return Venue.objects.filter(id=venue_id, organizer=user).first()


class OrganizerDashboardView(APIView):
    permission_classes = [IsApprovedOrganizer]

    def get(self, request):
        user = request.user
        concerts = _user_concerts(user)
        paid_orders = Order.objects.filter(concert__organizer=user, status='paid')
        return Response({
            'concerts_total': concerts.count(),
            'concerts_draft': concerts.filter(status='draft').count(),
            'concerts_pending_review': concerts.filter(status='pending_review').count(),
            'concerts_published': concerts.filter(status='published').count(),
            'orders_total': paid_orders.count(),
            'revenue_total': float(paid_orders.aggregate(total=Sum('total_price'))['total'] or 0),
            'tickets_sold': OrderItem.objects.filter(
                order__concert__organizer=user,
                order__status='paid',
            ).count(),
            'venues_owned': Venue.objects.filter(organizer=user).count(),
        })


class OrganizerStatisticsView(APIView):
    permission_classes = [IsApprovedOrganizer]

    def get(self, request):
        user = request.user
        concerts = _user_concerts(user)
        by_status = {row['status']: row['c'] for row in concerts.values('status').annotate(c=Count('id'))}
        revenue_by_concert = []
        for c in concerts:
            paid = Order.objects.filter(concert=c, status='paid')
            revenue_by_concert.append({
                'concert_id': str(c.id),
                'title': c.title,
                'status': c.status,
                'orders': paid.count(),
                'revenue': float(paid.aggregate(total=Sum('total_price'))['total'] or 0),
                'tickets_sold': OrderItem.objects.filter(order__concert=c, order__status='paid').count(),
            })
        revenue_by_concert.sort(key=lambda x: x['revenue'], reverse=True)
        return Response({
            'by_status': by_status,
            'concerts': revenue_by_concert[:20],
        })


class OrganizerConcertViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizerConcertSerializer
    permission_classes = [IsApprovedOrganizer]
    pagination_class = None

    def get_queryset(self):
        return _user_concerts(self.request.user)

    def destroy(self, request, *args, **kwargs):
        concert = self.get_object()
        if concert.status not in ('draft', 'rejected'):
            return Response(
                {'error': 'Chỉ xóa được concert nháp hoặc bị từ chối.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        concert = self.get_object()
        if concert.status not in ('draft', 'rejected'):
            return Response({'error': 'Concert không thể gửi duyệt ở trạng thái hiện tại.'}, status=400)
        concert.status = 'pending_review'
        concert.save(update_fields=['status', 'updated_at'])
        return Response(OrganizerConcertSerializer(concert).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        concert = self.get_object()
        if concert.status != 'approved':
            return Response({'error': 'Concert cần được admin duyệt trước khi publish.'}, status=400)
        concert.status = 'published'
        concert.save(update_fields=['status', 'updated_at'])
        return Response(OrganizerConcertSerializer(concert).data)

    @action(detail=True, methods=['post'])
    def sync_seats(self, request, pk=None):
        concert = self.get_object()
        venue_seats = Seat.objects.filter(venue=concert.venue)
        created = 0
        for seat in venue_seats:
            _, was_created = ConcertSeat.objects.get_or_create(
                concert=concert,
                seat=seat,
                defaults={'status': 'available'},
            )
            if was_created:
                created += 1
        return Response({
            'message': 'Đồng bộ ghế xong',
            'created': created,
            'total': ConcertSeat.objects.filter(concert=concert).count(),
        })

    @action(detail=True, methods=['get'])
    def seatmap(self, request, pk=None):
        concert = self.get_object()
        if not ConcertSeat.objects.filter(concert=concert).exists():
            venue_seats = Seat.objects.filter(venue=concert.venue)
            ConcertSeat.objects.bulk_create(
                [ConcertSeat(concert=concert, seat=seat, status='available') for seat in venue_seats],
                ignore_conflicts=True,
            )
        release_expired_reservations(concert)
        seatmap = []
        for zone in concert.venue.seat_zones.all():
            seats = ConcertSeat.objects.filter(
                concert=concert,
                seat__zone=zone,
            ).select_related('seat', 'reserved_by')
            seatmap.append({
                'zone_id': str(zone.id),
                'name': zone.name,
                'price': float(zone.price),
                'color': zone.color,
                'seats': [serialize_map_seat(cs, request.user) for cs in seats],
            })
        return Response({'zones': seatmap, 'concert_id': str(concert.id), 'concert_title': concert.title})


class OrganizerVenueViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizerVenueSerializer
    permission_classes = [IsApprovedOrganizer]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if self.request.query_params.get('owned') in ('1', 'true'):
            return Venue.objects.filter(organizer=user).order_by('name')
        if self.action == 'list':
            return Venue.objects.filter(Q(organizer__isnull=True) | Q(organizer=user)).order_by('name')
        return Venue.objects.filter(organizer=user).order_by('name')

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    def update(self, request, *args, **kwargs):
        venue = self.get_object()
        if venue.organizer_id != request.user.id:
            return Response({'error': 'Chỉ sửa được địa điểm do bạn tạo.'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        venue = self.get_object()
        if venue.organizer_id != request.user.id:
            return Response({'error': 'Chỉ xóa được địa điểm do bạn tạo.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class OrganizerSeatZoneViewSet(viewsets.ModelViewSet):
    serializer_class = SeatZoneSerializer
    permission_classes = [IsApprovedOrganizer]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        venue_id = self.request.query_params.get('venue_id')
        qs = SeatZone.objects.filter(venue__organizer=user).order_by('name')
        if venue_id:
            qs = qs.filter(venue_id=venue_id)
        return qs

    def create(self, request, *args, **kwargs):
        venue_id = request.data.get('venue_id')
        venue = _owned_venue(request.user, venue_id)
        if not venue:
            return Response({'error': 'Chỉ thêm khu ghế cho địa điểm do bạn tạo.'}, status=400)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def generate_seats(self, request, pk=None):
        zone = self.get_object()
        if zone.venue.organizer_id != request.user.id:
            return Response({'error': 'Không có quyền.'}, status=403)
        rows = request.data.get('rows') or default_row_labels()
        seats_per_row = int(request.data.get('seats_per_row', DEFAULT_SEATS_PER_ROW))
        aisle_after = int(request.data.get('aisle_after', DEFAULT_AISLE_AFTER))
        seats = []
        for row_idx, row_label in enumerate(rows):
            for seat_num in range(1, seats_per_row + 1):
                pos_x, pos_y = seat_pos_2d(row_idx, seat_num, aisle_after=aisle_after)
                seat = Seat.objects.create(
                    venue=zone.venue,
                    zone=zone,
                    row_label=row_label,
                    seat_number=seat_num,
                    pos_x=pos_x,
                    pos_y=pos_y,
                )
                seats.append(seat)
        return Response({'message': f'Đã sinh {len(seats)} ghế', 'count': len(seats)}, status=201)


class OrganizerOrderViewSet(viewsets.ViewSet):
    permission_classes = [IsApprovedOrganizer]

    def list(self, request):
        qs = Order.objects.filter(concert__organizer=request.user).select_related(
            'concert', 'concert__venue', 'user',
        ).order_by('-created_at')
        concert_id = request.query_params.get('concert_id')
        if concert_id:
            qs = qs.filter(concert_id=concert_id)
        orders = []
        for order in qs[:100]:
            concert = order.concert
            venue = concert.venue if concert else None
            orders.append({
                'id': str(order.id),
                'concert_id': str(concert.id) if concert else None,
                'concert_title': concert.title if concert else None,
                'concert_venue_name': venue.name if venue else None,
                'buyer_email': order.user.email if order.user else None,
                'buyer_name': order.user.full_name if order.user else None,
                'total_price': float(order.total_price),
                'status': order.status,
                'payment_method': order.payment_method,
                'created_at': order.created_at.isoformat(),
            })
        return Response(orders)


class OrganizerTicketViewSet(viewsets.ViewSet):
    permission_classes = [IsApprovedOrganizer]

    def list(self, request):
        user = request.user
        concert_id = request.query_params.get('concert_id')
        concerts = _user_concerts(user)
        if concert_id:
            concerts = concerts.filter(id=concert_id)
        result = []
        for concert in concerts:
            stats = ConcertSeat.objects.filter(concert=concert).aggregate(
                total=Count('id'),
                available=Count('id', filter=Q(status='available')),
                reserved=Count('id', filter=Q(status='reserved')),
                sold=Count('id', filter=Q(status='sold')),
            )
            zones = []
            for zone in concert.venue.seat_zones.all():
                zone_stats = ConcertSeat.objects.filter(
                    concert=concert,
                    seat__zone=zone,
                ).aggregate(
                    total=Count('id'),
                    available=Count('id', filter=Q(status='available')),
                    reserved=Count('id', filter=Q(status='reserved')),
                    sold=Count('id', filter=Q(status='sold')),
                )
                zones.append({
                    'zone_id': str(zone.id),
                    'name': zone.name,
                    'price': float(zone.price),
                    'color': zone.color,
                    **zone_stats,
                })
            result.append({
                'concert_id': str(concert.id),
                'title': concert.title,
                'status': concert.status,
                'start_time': concert.start_time.isoformat(),
                **stats,
                'zones': zones,
            })
        return Response(result)


class OrganizerArtistViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Artist.objects.all().order_by('name')
    serializer_class = ArtistSerializer
    permission_classes = [IsApprovedOrganizer]
    pagination_class = None
