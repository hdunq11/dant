from rest_framework import serializers

from app.artists.models import Artist
from app.artists.serializers import ArtistSerializer
from app.concerts.models import Concert, ConcertArtist
from app.concerts.serializers import ConcertArtistSerializer
from app.venues.models import Venue
from app.venues.serializers import VenueSerializer
from app.seats.models import SeatZone
from app.seats.serializers import SeatZoneSerializer


class OrganizerVenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = (
            'id', 'name', 'city', 'address', 'capacity', 'model_glb_path',
            'organizer', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'organizer', 'created_at', 'updated_at')


class OrganizerConcertSerializer(serializers.ModelSerializer):
    venue = VenueSerializer(read_only=True)
    venue_id = serializers.PrimaryKeyRelatedField(
        queryset=Venue.objects.all(),
        source='venue',
        write_only=True,
    )
    concert_artists = ConcertArtistSerializer(read_only=True, many=True)
    artists = serializers.PrimaryKeyRelatedField(
        write_only=True,
        queryset=Artist.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Concert
        fields = (
            'id', 'title', 'description', 'start_time', 'end_time',
            'venue', 'venue_id', 'banner_url', 'concert_artists', 'artists',
            'status', 'event_source', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'status', 'event_source', 'created_at', 'updated_at')

    def create(self, validated_data):
        artists = validated_data.pop('artists', [])
        user = self.context['request'].user
        concert = Concert.objects.create(
            organizer=user,
            event_source='external',
            status='draft',
            **validated_data,
        )
        for artist in artists:
            ConcertArtist.objects.create(concert=concert, artist=artist)
        return concert

    def update(self, instance, validated_data):
        if instance.status not in ('draft', 'rejected'):
            raise serializers.ValidationError('Chỉ sửa được concert ở trạng thái nháp hoặc bị từ chối.')
        artists = validated_data.pop('artists', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if artists is not None:
            instance.concert_artists.all().delete()
            for artist in artists:
                ConcertArtist.objects.create(concert=instance, artist=artist)
        return instance


class OrganizerSeatZoneSerializer(SeatZoneSerializer):
    pass
