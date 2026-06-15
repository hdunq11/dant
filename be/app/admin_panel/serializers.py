from rest_framework import serializers

from app.users.models import User, OrganizerProfile
from app.users.serializers import OrganizerProfileSerializer


class AdminUserSerializer(serializers.ModelSerializer):
    organizer_profile = OrganizerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'full_name',
            'role',
            'is_active',
            'is_staff',
            'organizer_profile',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'email', 'created_at', 'updated_at')


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name', 'role', 'is_active', 'is_staff')


class OrganizerRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')
