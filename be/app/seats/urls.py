from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SeatZoneViewSet, SeatViewSet, ConcertSeatViewSet

router = DefaultRouter()
router.register(r'zones', SeatZoneViewSet)
router.register(r'seats', SeatViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('booking/reserve/', ConcertSeatViewSet.as_view({'post': 'reserve'}), name='seat-reserve'),
]
