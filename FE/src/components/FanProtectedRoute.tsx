import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath, isAdminUser, isOrganizerUser } from '../utils/authRedirect';
import { Spinner } from './Spinner';

/** Route fan cần đăng nhập — từ chối admin & organizer */
export function FanProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (isAdminUser(user) || isOrganizerUser(user)) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }
  return <>{children}</>;
}
