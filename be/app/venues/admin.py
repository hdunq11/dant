from django.contrib import admin
from .models import Venue

@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'capacity', 'created_at')
    list_filter = ('city', 'created_at')
    search_fields = ('name', 'city')
    readonly_fields = ('id', 'created_at', 'updated_at')
