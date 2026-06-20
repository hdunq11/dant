from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet,
    VoucherValidateView,
    VoucherListView,
    VoucherAdminViewSet,
    PaymentConfigView,
    PayPalCompleteView,
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'admin/vouchers', VoucherAdminViewSet, basename='admin-voucher')

urlpatterns = [
    path('payment-config/', PaymentConfigView.as_view(), name='payment-config'),
    path('paypal/complete/', PayPalCompleteView.as_view(), name='paypal-complete'),
    path('vouchers/', VoucherListView.as_view(), name='voucher-list'),
    path('vouchers/validate/', VoucherValidateView.as_view(), name='voucher-validate'),
    path('', include(router.urls)),
]
