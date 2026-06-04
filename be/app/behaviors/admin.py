from django.contrib import admin
from .models import UserBehavior, Favorite

@admin.register(UserBehavior)
class UserBehaviorAdmin(admin.ModelAdmin):
    list_display = ('user', 'concert', 'action', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('user__email', 'concert__title')
    readonly_fields = ('id', 'created_at')

@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'concert', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'concert__title')
    readonly_fields = ('created_at',)
