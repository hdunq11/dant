from django.contrib import admin
from .models import Concert, ConcertArtist

class ConcertArtistInline(admin.TabularInline):
    model = ConcertArtist
    extra = 1

@admin.register(Concert)
class ConcertAdmin(admin.ModelAdmin):
    list_display = ('title', 'venue', 'start_time', 'end_time', 'created_at')
    list_filter = ('venue', 'start_time', 'created_at')
    search_fields = ('title', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [ConcertArtistInline]

@admin.register(ConcertArtist)
class ConcertArtistAdmin(admin.ModelAdmin):
    list_display = ('concert', 'artist')
    search_fields = ('concert__title', 'artist__name')
