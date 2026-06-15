import type { User } from '../types';

export function isAdminUser(user: User | null | undefined) {
  return !!user && (user.role === 'admin' || user.is_staff === true);
}

export function isOrganizerUser(user: User | null | undefined) {
  return !!user && (user.role === 'organizer' || !!user.organizer_profile);
}

export function isFanUser(user: User | null | undefined) {
  return !!user && !isAdminUser(user) && !isOrganizerUser(user);
}

/** Trang chủ mặc định theo role — không lẫn UI */
export function getRoleHomePath(user: User): string {
  if (isAdminUser(user)) return '/admin';
  if (user.organizer_profile?.status === 'approved') return '/organizer';
  if (isOrganizerUser(user)) return '/organizer/pending';
  return '/';
}

/** Sau đăng nhập — chỉ redirect về đúng khu vực role */
export function resolvePostLoginPath(user: User, from = '/'): string {
  const home = getRoleHomePath(user);
  const admin = isAdminUser(user);
  const organizer = isOrganizerUser(user);

  if (from && from !== '/login' && from !== '/') {
    if (admin && from.startsWith('/admin')) return from;
    if (organizer && from.startsWith('/organizer')) {
      if (user.organizer_profile?.status === 'approved') return from;
      return '/organizer/pending';
    }
    if (admin || organizer) return home;
    return from;
  }

  return home;
}
