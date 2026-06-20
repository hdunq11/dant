from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser
from django.db.models import Q
from .models import Concert, ConcertArtist
from .serializers import ConcertSerializer
from app.seats.models import ConcertSeat, Seat
from app.seats.reservation import release_expired_reservations, serialize_map_seat
from app.orders.seat_lifecycle import cancel_stale_pending_orders, reconcile_concert_seats


class ConcertViewSet(viewsets.ModelViewSet):
    queryset = Concert.objects.prefetch_related('concert_artists__artist', 'venue').all()
    serializer_class = ConcertSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'artists', 'venue', 'seatmap']:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = self.queryset
        user = self.request.user
        is_staff = user.is_authenticated and (user.is_staff or getattr(user, 'role', '') == 'admin')
        if not is_staff:
            queryset = queryset.filter(status='published')

        status_filter = self.request.query_params.get('status')
        if status_filter and is_staff:
            queryset = queryset.filter(status=status_filter)

        event_source = self.request.query_params.get('event_source')
        if event_source and is_staff:
            queryset = queryset.filter(event_source=event_source)
        # Search by title
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))
        
        # Filter by genre (through artists)
        genre = self.request.query_params.get('genre', '')
        if genre:
            queryset = queryset.filter(concert_artists__artist__genre__icontains=genre).distinct()
        
        # Filter by city (through venue)
        city = self.request.query_params.get('city', '')
        if city:
            queryset = queryset.filter(venue__city__icontains=city)
        
        # Filter by date
        date = self.request.query_params.get('date', '')
        if date:
            queryset = queryset.filter(start_time__date=date)
        
        return queryset

    @action(detail=True, methods=['get'])
    def artists(self, request, pk=None):
        concert = self.get_object()
        artists = [ca.artist for ca in concert.concert_artists.all()]
        from app.artists.serializers import ArtistSerializer
        serializer = ArtistSerializer(artists, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def venue(self, request, pk=None):
        concert = self.get_object()
        from app.venues.serializers import VenueSerializer
        serializer = VenueSerializer(concert.venue)
        return Response(serializer.data)

    def _venue_concert_seats(self, concert):
        return ConcertSeat.objects.filter(concert=concert, seat__venue=concert.venue)

    def _ensure_concert_seats(self, concert):
        """Tự tạo concert_seats từ ghế venue; bỏ ghế lạ venue khác."""
        ConcertSeat.objects.filter(concert=concert).exclude(seat__venue=concert.venue).delete()
        if self._venue_concert_seats(concert).exists():
            return
        venue_seats = Seat.objects.filter(venue=concert.venue)
        ConcertSeat.objects.bulk_create(
            [
                ConcertSeat(concert=concert, seat=seat, status='available')
                for seat in venue_seats
            ],
            ignore_conflicts=True,
        )

    @action(detail=True, methods=['get'])
    def seatmap(self, request, pk=None):
        concert = self.get_object()
        self._ensure_concert_seats(concert)
        release_expired_reservations(concert)
        cancel_stale_pending_orders(concert)
        reconcile_concert_seats(concert)
        zones = concert.venue.seat_zones.all()

        seatmap = []
        for zone in zones:
            seats = self._venue_concert_seats(concert).filter(
                seat__zone=zone
            ).select_related('seat', 'reserved_by')

            seatmap.append({
                'zone_id': str(zone.id),
                'name': zone.name,
                'price': float(zone.price),
                'color': zone.color,
                'seats': [serialize_map_seat(cs, request.user) for cs in seats],
            })

        return Response({'zones': seatmap})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def sync_seats(self, request, pk=None):
        """Tạo concert_seats từ toàn bộ ghế của venue (admin)."""
        concert = self.get_object()
        removed = ConcertSeat.objects.filter(concert=concert).exclude(seat__venue=concert.venue).delete()[0]
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
            'message': f'Đồng bộ ghế xong',
            'created': created,
            'removed_orphans': removed,
            'total': self._venue_concert_seats(concert).count(),
        })
