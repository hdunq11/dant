from django.urls import path
from .views import (
    UserRegisterView,
    UserLoginView,
    UserMeView,
    UserChangePasswordView,
    UserFavoritesView,
    UserFavoriteDeleteView,
    UserOrdersView,
    UserOrderDetailView,
)

urlpatterns = [
    path('auth/register/', UserRegisterView.as_view(), name='user-register'),
    path('auth/login/', UserLoginView.as_view(), name='user-login'),
    path('me/', UserMeView.as_view(), name='user-me'),
    path('me/change-password/', UserChangePasswordView.as_view(), name='user-change-password'),
    path('me/favorites/', UserFavoritesView.as_view(), name='user-favorites'),
    path('me/favorites/<uuid:concert_id>/', UserFavoriteDeleteView.as_view(), name='user-favorite-delete'),
    path('me/orders/', UserOrdersView.as_view(), name='user-orders'),
    path('me/orders/<uuid:order_id>/', UserOrderDetailView.as_view(), name='user-order-detail'),
]
