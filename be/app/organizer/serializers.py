from rest_framework import serializers

from app.artists.models import Artist
from app.concerts.models import Concert, ConcertArtist
from app.concerts.serializers import ConcertArtistSerializer
from app.venues.models import Venue
from app.venues.serializers import VenueSerializer
from app.seats.stage_templates import (
    STAGE_TEMPLATES,
    validate_desired_seat_count,
)
from app.seats.serializers import SeatZoneSerializer


def _resolve_artists_from_names(names):
    artists = []
    seen = set()
    for raw in names or []:
        name = (raw or '').strip()
        if not name:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        artist = Artist.objects.filter(name__iexact=name).first()
        if not artist:
            artist = Artist.objects.create(name=name, genre='other')
        artists.append(artist)
    return artists


def _sync_concert_artists(concert, artist_names):
    concert.concert_artists.all().delete()
    for artist in _resolve_artists_from_names(artist_names):
        ConcertArtist.objects.create(concert=concert, artist=artist)


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
    artist_names = serializers.ListField(
        child=serializers.CharField(max_length=255),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    stage_template = serializers.ChoiceField(
        choices=[(key, meta['label']) for key, meta in STAGE_TEMPLATES.items()],
        required=False,
    )
    desired_seat_count = serializers.IntegerField(required=False, min_value=1)

    class Meta:
        model = Concert
        fields = (
            'id', 'title', 'description', 'start_time', 'end_time',
            'venue', 'venue_id', 'banner_url', 'concert_artists', 'artist_names',
            'stage_template', 'desired_seat_count',
            'status', 'event_source', 'service_fee_percent', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'status', 'event_source', 'created_at', 'updated_at')

    def validate_service_fee_percent(self, value):
        if value is not None and (value < 0 or value > 50):
            raise serializers.ValidationError('Phí dịch vụ phải từ 0% đến 50%.')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        instance = self.instance
        stage = attrs.get('stage_template')
        desired = attrs.get('desired_seat_count')
        venue = attrs.get('venue')

        if instance is None:
            if not stage:
                raise serializers.ValidationError({'stage_template': 'Vui lòng chọn sân khấu.'})
            if desired is None:
                raise serializers.ValidationError({'desired_seat_count': 'Vui lòng nhập số ghế mong muốn.'})
            try:
                validate_desired_seat_count(stage, desired)
            except ValueError as exc:
                raise serializers.ValidationError({'desired_seat_count': str(exc)}) from exc
            if not venue:
                raise serializers.ValidationError({'venue_id': 'Vui lòng chọn hoặc tạo địa điểm.'})
            if venue.organizer_id != user.id:
                raise serializers.ValidationError({
                    'venue_id': 'Chọn venue do bạn tạo.',
                })
        else:
            next_stage = stage if stage is not None else instance.stage_template
            next_desired = desired if desired is not None else instance.desired_seat_count
            if next_stage and next_desired is not None:
                try:
                    validate_desired_seat_count(next_stage, next_desired)
                except ValueError as exc:
                    raise serializers.ValidationError({'desired_seat_count': str(exc)}) from exc
            if venue and venue.organizer_id != user.id and (stage is not None or desired is not None):
                raise serializers.ValidationError({
                    'venue_id': 'Chỉ đổi sân khấu trên venue do bạn tạo.',
                })
        return attrs

    def create(self, validated_data):
        artist_names = validated_data.pop('artist_names', [])
        stage_template = validated_data.pop('stage_template')
        desired_seat_count = validated_data.pop('desired_seat_count')
        user = self.context['request'].user

        concert = Concert.objects.create(
            organizer=user,
            event_source='external',
            status='draft',
            stage_template=stage_template,
            desired_seat_count=desired_seat_count,
            **validated_data,
        )
        _sync_concert_artists(concert, artist_names)
        return concert

    def update(self, instance, validated_data):
        if instance.status not in ('draft', 'rejected'):
            raise serializers.ValidationError('Chỉ sửa được concert ở trạng thái nháp hoặc bị từ chối.')
        artist_names = validated_data.pop('artist_names', None)
        stage_template = validated_data.pop('stage_template', None)
        desired_seat_count = validated_data.pop('desired_seat_count', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if stage_template is not None:
            instance.stage_template = stage_template
        if desired_seat_count is not None:
            instance.desired_seat_count = desired_seat_count

        instance.save()
        if artist_names is not None:
            _sync_concert_artists(instance, artist_names)
        return instance


class OrganizerSeatZoneSerializer(SeatZoneSerializer):
    pass
