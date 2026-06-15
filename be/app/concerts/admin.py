from django.contrib import admin
from .models import Concert, ConcertArtist

class ConcertArtistInline(admin.TabularInline):
    model = ConcertArtist
    extra = 1

@admin.register(Concert)
class ConcertAdmin(admin.ModelAdmin):
    list_display = ('title', 'venue', 'organizer', 'status', 'event_source', 'start_time', 'created_at')
    list_filter = ('status', 'event_source', 'venue', 'start_time', 'created_at')
    search_fields = ('title', 'description', 'organizer__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [ConcertArtistInline]
    actions = ('approve_concerts', 'reject_concerts', 'publish_concerts')

    @admin.action(description='Duyệt concert đã chọn')
    def approve_concerts(self, request, queryset):
        queryset.filter(status='pending_review').update(status='approved')

    @admin.action(description='Từ chối concert đã chọn')
    def reject_concerts(self, request, queryset):
        queryset.filter(status='pending_review').update(status='rejected')

    @admin.action(description='Publish concert đã duyệt')
    def publish_concerts(self, request, queryset):
        queryset.filter(status='approved').update(status='published')

@admin.register(ConcertArtist)
class ConcertArtistAdmin(admin.ModelAdmin):
    list_display = ('concert', 'artist')
    search_fields = ('concert__title', 'artist__name')
