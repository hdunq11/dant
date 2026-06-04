from django.contrib import admin
from .models import Artist

@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ('name', 'genre', 'created_at')
    list_filter = ('genre', 'created_at')
    search_fields = ('name', 'genre')
    readonly_fields = ('id', 'created_at', 'updated_at')
