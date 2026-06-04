from rest_framework import serializers
from .models import Artist


class ArtistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = ('id', 'name', 'genre', 'description', 'image_url', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
