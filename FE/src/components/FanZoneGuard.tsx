import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath, isAdminUser, isOrganizerUser } from '../utils/authRedirect';
import { Spinner } from './Spinner';

/** Chặn admin/organizer vào UI fan (khách vẫn xem được trang công khai) */
export function FanZoneGuard() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (isAuthenticated && user && (isAdminUser(user) || isOrganizerUser(user))) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }
  return <Outlet />;
}
