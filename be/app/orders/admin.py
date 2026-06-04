from django.contrib import admin
from .models import Order, OrderItem, Voucher


@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percent', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('code',)

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'concert', 'total_price', 'voucher_code',
        'delivery_method', 'status', 'created_at',
    )
    list_filter = ('status', 'concert', 'created_at')
    search_fields = ('user__email', 'concert__title')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [OrderItemInline]

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'seat', 'price', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('order__id', 'seat__row_label')
    readonly_fields = ('id', 'created_at')
