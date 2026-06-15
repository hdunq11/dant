from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AdminDashboardView,
    AdminReportsView,
    AdminUserViewSet,
    AdminOrganizerViewSet,
    AdminConcertReviewViewSet,
)

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-user')
router.register(r'organizers', AdminOrganizerViewSet, basename='admin-organizer')
router.register(r'concerts', AdminConcertReviewViewSet, basename='admin-concert-review')

urlpatterns = [
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('reports/', AdminReportsView.as_view(), name='admin-reports'),
    path('', include(router.urls)),
]
