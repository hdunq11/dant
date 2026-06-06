import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './Spinner';

export function isAdminUser(user: { role?: string; is_staff?: boolean } | null) {
  return !!user && (user.role === 'admin' || user.is_staff === true);
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
