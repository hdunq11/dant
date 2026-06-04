from django.contrib import admin
from .models import SeatZone, Seat, ConcertSeat

@admin.register(SeatZone)
class SeatZoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'venue', 'price', 'created_at')
    list_filter = ('venue', 'created_at')
    search_fields = ('name', 'venue__name')
    readonly_fields = ('id', 'created_at', 'updated_at')

@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ('row_label', 'seat_number', 'zone', 'venue', 'created_at')
    list_filter = ('zone', 'venue')
    search_fields = ('row_label', 'zone__name')
    readonly_fields = ('id', 'created_at')

@admin.register(ConcertSeat)
class ConcertSeatAdmin(admin.ModelAdmin):
    list_display = ('concert', 'seat', 'status', 'created_at')
    list_filter = ('status', 'concert', 'created_at')
    search_fields = ('concert__title', 'seat__row_label')
    readonly_fields = ('id', 'created_at', 'updated_at')
