from rest_framework import serializers
from .models import UserBehavior, Favorite


class UserBehaviorSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserBehavior
        fields = ('id', 'user', 'concert', 'action', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')


class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = ('user', 'concert', 'created_at')
        read_only_fields = ('created_at',)
