from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    message = 'Chỉ admin mới truy cập được.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or getattr(user, 'role', '') == 'admin')
        )
