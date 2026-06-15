import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminUser, isOrganizerUser } from '../utils/authRedirect';
import { Spinner } from './Spinner';

/** Chỉ organizer chưa duyệt / bị từ chối */
export function OrganizerPendingRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: '/organizer/pending' }} />;
  }
  if (isAdminUser(user)) {
    return <Navigate to="/admin" replace />;
  }
  if (!isOrganizerUser(user)) {
    return <Navigate to="/" replace />;
  }
  if (user.organizer_profile?.status === 'approved') {
    return <Navigate to="/organizer" replace />;
  }
  return <>{children}</>;
}
