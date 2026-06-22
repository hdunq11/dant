from django.contrib import admin
from django.utils import timezone
from .models import User, OrganizerProfile


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'created_at')
    search_fields = ('email', 'full_name')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(OrganizerProfile)
class OrganizerProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'user', 'service_fee_percent', 'status', 'business_license', 'created_at', 'reviewed_at')
    list_filter = ('status', 'created_at')
    search_fields = ('company_name', 'business_license', 'user__email', 'user__full_name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'reviewed_at')
    actions = ('approve_profiles', 'reject_profiles')

    @admin.action(description='Duyệt hồ sơ tổ chức đã chọn')
    def approve_profiles(self, request, queryset):
        queryset.filter(status='pending').update(
            status='approved',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            rejection_reason='',
        )

    @admin.action(description='Từ chối hồ sơ tổ chức đã chọn')
    def reject_profiles(self, request, queryset):
        queryset.filter(status='pending').update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
