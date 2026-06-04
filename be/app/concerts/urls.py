from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConcertViewSet

router = DefaultRouter()
router.register(r'concerts', ConcertViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
