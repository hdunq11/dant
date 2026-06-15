from rest_framework.permissions import BasePermission

from app.users.models import OrganizerProfile


class IsApprovedOrganizer(BasePermission):
  message = 'Chỉ nhà tổ chức đã được duyệt mới truy cập được.'

  def has_permission(self, request, view):
    user = request.user
    if not user.is_authenticated:
      return False
    if user.is_staff or getattr(user, 'role', '') == 'admin':
      return True
    if getattr(user, 'role', '') != 'organizer':
      return False
    try:
      return user.organizer_profile.status == 'approved'
    except OrganizerProfile.DoesNotExist:
      return False
