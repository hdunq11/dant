from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser, IsAuthenticated
from .models import SeatZone, Seat, ConcertSeat
from .serializers import SeatZoneSerializer, SeatSerializer
from app.concerts.models import Concert
from .reservation import (
    hold_until,
    release_expired_reservations,
    release_user_reservations,
)


class SeatZoneViewSet(viewsets.ModelViewSet):
    queryset = SeatZone.objects.all().order_by('name')
    serializer_class = SeatZoneSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        venue_id = self.request.query_params.get('venue_id')
        if venue_id:
            return SeatZone.objects.filter(venue_id=venue_id).order_by('name')
        return SeatZone.objects.all().order_by('name')

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def generate_seats(self, request, pk=None):
        zone = self.get_object()
        rows = request.data.get('rows', [])
        seats_per_row = request.data.get('seats_per_row', 10)

        seats = []
        for row_idx, row_label in enumerate(rows):
            for seat_num in range(1, seats_per_row + 1):
                seat = Seat.objects.create(
                    venue=zone.venue,
                    zone=zone,
                    row_label=row_label,
                    seat_number=seat_num,
                    pos_x=seat_num * 10.0,
                    pos_y=row_idx * 10.0,
                )
                seats.append(seat)

        return Response({
            'message': f'Generated {len(seats)} seats',
            'count': len(seats)
        }, status=status.HTTP_201_CREATED)


class SeatViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Seat.objects.all().order_by('row_label', 'seat_number')
    serializer_class = SeatSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        zone_id = self.request.query_params.get('zone_id')
        if zone_id:
            return Seat.objects.filter(zone_id=zone_id).order_by('row_label', 'seat_number')
        return Seat.objects.all().order_by('row_label', 'seat_number')


class ConcertSeatViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def reserve(self, request):
        """Reserve seats for a concert"""
        concert_id = request.data.get('concert_id')
        seat_ids = request.data.get('seat_ids', [])

        try:
            concert = Concert.objects.get(id=concert_id)
        except Concert.DoesNotExist:
            return Response(
                {'error': 'Concert not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        release_expired_reservations(concert)

        reserved_seats = []
        until = hold_until()

        for seat_id in seat_ids:
            try:
                concert_seat = ConcertSeat.objects.get(concert=concert, seat_id=seat_id)

                if concert_seat.status == 'sold':
                    return Response(
                        {'error': f'Seat {seat_id} is not available'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if concert_seat.status == 'reserved':
                    if concert_seat.reserved_by_id != request.user.id:
                        return Response(
                            {'error': f'Seat {seat_id} is not available'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                elif concert_seat.status != 'available':
                    return Response(
                        {'error': f'Seat {seat_id} is not available'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                concert_seat.status = 'reserved'
                concert_seat.reserved_until = until
                concert_seat.reserved_by = request.user
                concert_seat.save()
                reserved_seats.append(concert_seat)
            except ConcertSeat.DoesNotExist:
                return Response(
                    {'error': f'Seat {seat_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response({
            'message': f'Reserved {len(reserved_seats)} seats',
            'reserved_until': until.isoformat(),
            'reserved_count': len(reserved_seats),
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def release(self, request):
        """Release seats held by current user for a concert."""
        concert_id = request.data.get('concert_id')
        try:
            concert = Concert.objects.get(id=concert_id)
        except Concert.DoesNotExist:
            return Response(
                {'error': 'Concert not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        count = release_user_reservations(concert, request.user)
        return Response({
            'message': f'Released {count} seats',
            'released_count': count,
        }, status=status.HTTP_200_OK)
