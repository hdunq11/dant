import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath, isAdminUser } from '../utils/authRedirect';
import { Spinner } from './Spinner';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdminUser(user)) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }
  return <>{children}</>;
}
