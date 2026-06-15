from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizerDashboardView,
    OrganizerStatisticsView,
    OrganizerConcertViewSet,
    OrganizerVenueViewSet,
    OrganizerSeatZoneViewSet,
    OrganizerOrderViewSet,
    OrganizerTicketViewSet,
    OrganizerArtistViewSet,
)

router = DefaultRouter()
router.register(r'concerts', OrganizerConcertViewSet, basename='organizer-concert')
router.register(r'venues', OrganizerVenueViewSet, basename='organizer-venue')
router.register(r'zones', OrganizerSeatZoneViewSet, basename='organizer-zone')
router.register(r'orders', OrganizerOrderViewSet, basename='organizer-order')
router.register(r'tickets', OrganizerTicketViewSet, basename='organizer-ticket')
router.register(r'artists', OrganizerArtistViewSet, basename='organizer-artist')

urlpatterns = [
    path('dashboard/', OrganizerDashboardView.as_view(), name='organizer-dashboard'),
    path('statistics/', OrganizerStatisticsView.as_view(), name='organizer-statistics'),
    path('', include(router.urls)),
]
