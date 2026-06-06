from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, VoucherValidateView, VoucherListView, VoucherAdminViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'admin/vouchers', VoucherAdminViewSet, basename='admin-voucher')

urlpatterns = [
    path('vouchers/', VoucherListView.as_view(), name='voucher-list'),
    path('vouchers/validate/', VoucherValidateView.as_view(), name='voucher-validate'),
    path('', include(router.urls)),
]
