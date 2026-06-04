from rest_framework import serializers
from .models import Venue


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ('id', 'name', 'city', 'address', 'capacity', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
