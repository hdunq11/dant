from rest_framework import serializers
from app.artists.models import Artist
from app.artists.serializers import ArtistSerializer
from app.venues.models import Venue
from app.venues.serializers import VenueSerializer
from .models import Concert, ConcertArtist


class ConcertArtistSerializer(serializers.ModelSerializer):
    artist = ArtistSerializer(read_only=True)

    class Meta:
        model = ConcertArtist
        fields = ('artist',)


class ConcertSerializer(serializers.ModelSerializer):
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
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        artists = validated_data.pop('artists', [])
        concert = Concert.objects.create(**validated_data)
        for artist in artists:
            ConcertArtist.objects.create(concert=concert, artist=artist)
        return concert

    def update(self, instance, validated_data):
        artists = validated_data.pop('artists', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if artists is not None:
            instance.concert_artists.all().delete()
            for artist in artists:
                ConcertArtist.objects.create(concert=instance, artist=artist)
        return instance
