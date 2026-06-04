from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserBehaviorViewSet, RecommendationView

router = DefaultRouter()
router.register(r'behaviors', UserBehaviorViewSet, basename='behavior')

urlpatterns = [
    path('', include(router.urls)),
    path('recommend/', RecommendationView.as_view(), name='recommend'),
]
