from django.urls import path
from .views import (
    UserRegisterView,
    UserLoginView,
    UserMeView,
    UserFavoritesView,
    UserFavoriteDeleteView,
    UserOrdersView,
)

urlpatterns = [
    path('auth/register/', UserRegisterView.as_view(), name='user-register'),
    path('auth/login/', UserLoginView.as_view(), name='user-login'),
    path('me/', UserMeView.as_view(), name='user-me'),
    path('me/favorites/', UserFavoritesView.as_view(), name='user-favorites'),
    path('me/favorites/<uuid:concert_id>/', UserFavoriteDeleteView.as_view(), name='user-favorite-delete'),
    path('me/orders/', UserOrdersView.as_view(), name='user-orders'),
]
