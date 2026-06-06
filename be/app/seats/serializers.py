from rest_framework import serializers
from .models import SeatZone, Seat, ConcertSeat
from app.venues.models import Venue
from app.venues.serializers import VenueSerializer


class SeatZoneSerializer(serializers.ModelSerializer):
    venue_id = serializers.PrimaryKeyRelatedField(
        queryset=Venue.objects.all(),
        source='venue',
        write_only=True,
        required=False,
    )

    class Meta:
        model = SeatZone
        fields = ('id', 'name', 'price', 'color', 'venue_id', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class SeatSerializer(serializers.ModelSerializer):
    zone = SeatZoneSerializer(read_only=True)

    class Meta:
        model = Seat
        fields = ('id', 'zone', 'row_label', 'seat_number', 'pos_x', 'pos_y', 'pos_z', 'created_at')
        read_only_fields = ('id', 'created_at')


class ConcertSeatSerializer(serializers.ModelSerializer):
    seat = SeatSerializer(read_only=True)

    class Meta:
        model = ConcertSeat
        fields = ('id', 'seat', 'status', 'reserved_until', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class SeatMapSerializer(serializers.Serializer):
    zone_id = serializers.UUIDField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    seats = serializers.SerializerMethodField()

    def get_seats(self, obj):
        return [
            {
                'seat_id': seat.id,
                'row': seat.row_label,
                'number': seat.seat_number,
                'status': seat.status,
                'pos_x': seat.pos_x,
                'pos_y': seat.pos_y,
                'pos_z': seat.pos_z,
            }
            for seat in obj.get('seats', [])
        ]
