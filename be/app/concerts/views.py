from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser
from django.db.models import Q
from .models import Concert, ConcertArtist
from .serializers import ConcertSerializer
from app.seats.models import ConcertSeat


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

    @action(detail=True, methods=['get'])
    def seatmap(self, request, pk=None):
        concert = self.get_object()
        zones = concert.venue.seat_zones.all()
        
        seatmap = []
        for zone in zones:
            seats = ConcertSeat.objects.filter(
                concert=concert,
                seat__zone=zone
            ).select_related('seat')
            
            seatmap.append({
                'zone_id': str(zone.id),
                'name': zone.name,
                'price': float(zone.price),
                'color': zone.color,
                'seats': [
                    {
                        'seat_id': str(cs.seat.id),
                        'row': cs.seat.row_label,
                        'number': cs.seat.seat_number,
                        'status': cs.status,
                        'pos_x': cs.seat.pos_x,
                        'pos_y': cs.seat.pos_y,
                    }
                    for cs in seats
                ]
            })
        
        return Response({'zones': seatmap})
