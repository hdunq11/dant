import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminUser, isOrganizerUser } from '../utils/authRedirect';
import { Spinner } from './Spinner';

export function OrganizerRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isOrganizerApproved } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (isAdminUser(user)) {
    return <Navigate to="/admin" replace />;
  }
  if (!isOrganizerUser(user)) {
    return <Navigate to="/" replace />;
  }
  if (!isOrganizerApproved) {
    return <Navigate to="/organizer/pending" replace />;
  }
  return <>{children}</>;
}
