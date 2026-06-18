import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FanZoneGuard } from './components/FanZoneGuard';
import { FanProtectedRoute } from './components/FanProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { OrganizerPendingPage } from './pages/OrganizerPendingPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConcertDetailPage } from './pages/ConcertDetailPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { EditProfilePage, InfoPage, ProfilePage } from './pages/ProfilePage';
import { SeatSelectionPage } from './pages/SeatSelectionPage';
import { TicketsPage } from './pages/TicketsPage';

const VrPreviewPage = lazy(() =>
  import('./pages/VrPreviewPage').then((m) => ({ default: m.VrPreviewPage }))
);
const Stage1VrPreviewPage = lazy(() =>
  import('./pages/Stage1VrPreviewPage').then((m) => ({ default: m.Stage1VrPreviewPage }))
);
import { AdminRoute } from './components/AdminRoute';
import { OrganizerRoute } from './components/OrganizerRoute';
import { OrganizerPendingRoute } from './components/OrganizerPendingRoute';
import { Spinner } from './components/Spinner';
import { useAuth } from './context/AuthContext';
import { getRoleHomePath, resolvePostLoginPath } from './utils/authRedirect';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminConcertsPage } from './pages/admin/AdminConcertsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVenuesPage } from './pages/admin/AdminVenuesPage';
import { AdminVouchersPage } from './pages/admin/AdminVouchersPage';
import { OrganizerLayout } from './pages/organizer/OrganizerLayout';
import { OrganizerDashboardPage } from './pages/organizer/OrganizerDashboardPage';
import { OrganizerConcertsPage } from './pages/organizer/OrganizerConcertsPage';
import { OrganizerCreateConcertPage } from './pages/organizer/OrganizerCreateConcertPage';
import { OrganizerSeatMapPage } from './pages/organizer/OrganizerSeatMapPage';
import { OrganizerTicketsPage } from './pages/organizer/OrganizerTicketsPage';
import { OrganizerOrdersPage } from './pages/organizer/OrganizerOrdersPage';
import { OrganizerStatisticsPage } from './pages/organizer/OrganizerStatisticsPage';
import { VrExperienceV2 } from './components/vr/VrExperienceV2';

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (isAuthenticated && user) {
    return <Navigate to={resolvePostLoginPath(user)} replace />;
  }
  return <>{children}</>;
}

function RoleAwareRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="test" element={<VrExperienceV2 />} />

          {/* UI Fan — khách + user thường */}
          <Route element={<FanZoneGuard />}>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="concerts/:id" element={<ConcertDetailPage />} />
              <Route
                path="concerts/:id/seats"
                element={
                  <FanProtectedRoute>
                    <SeatSelectionPage />
                  </FanProtectedRoute>
                }
              />
              <Route
                path="concerts/:id/checkout"
                element={
                  <FanProtectedRoute>
                    <CheckoutPage />
                  </FanProtectedRoute>
                }
              />
              <Route
                path="orders/:orderId/success"
                element={
                  <FanProtectedRoute>
                    <ConfirmationPage />
                  </FanProtectedRoute>
                }
              />
              <Route
                path="tickets"
                element={
                  <FanProtectedRoute>
                    <TicketsPage />
                  </FanProtectedRoute>
                }
              />
              <Route
                path="favorites"
                element={
                  <FanProtectedRoute>
                    <FavoritesPage />
                  </FanProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <FanProtectedRoute>
                    <ProfilePage />
                  </FanProtectedRoute>
                }
              />
              <Route
                path="profile/edit"
                element={
                  <FanProtectedRoute>
                    <EditProfilePage />
                  </FanProtectedRoute>
                }
              />
              <Route path="info/payment" element={<InfoPage kind="payment" />} />
              <Route path="info/terms" element={<InfoPage kind="terms" />} />
            </Route>
            <Route
              path="concerts/:id/vr-preview"
              element={
                <FanProtectedRoute>
                  <Suspense fallback={<Spinner />}>
                    <VrPreviewPage />
                  </Suspense>
                </FanProtectedRoute>
              }
            />
            <Route
              path="concerts/:id/vr-stage1"
              element={
                <FanProtectedRoute>
                  <Suspense fallback={<Spinner />}>
                    <Stage1VrPreviewPage />
                  </Suspense>
                </FanProtectedRoute>
              }
            />
          </Route>

          <Route
            path="login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            path="register"
            element={
              <GuestOnly>
                <RegisterPage />
              </GuestOnly>
            }
          />

          {/* UI Organizer — chờ duyệt */}
          <Route
            path="organizer/pending"
            element={
              <OrganizerPendingRoute>
                <OrganizerPendingPage />
              </OrganizerPendingRoute>
            }
          />

          {/* UI Organizer — đã duyệt */}
          <Route
            path="organizer"
            element={
              <OrganizerRoute>
                <OrganizerLayout />
              </OrganizerRoute>
            }
          >
            <Route index element={<OrganizerDashboardPage />} />
            <Route path="concerts" element={<OrganizerConcertsPage />} />
            <Route path="concerts/create" element={<OrganizerCreateConcertPage />} />
            <Route path="seatmap" element={<OrganizerSeatMapPage />} />
            <Route path="tickets" element={<OrganizerTicketsPage />} />
            <Route path="orders" element={<OrganizerOrdersPage />} />
            <Route path="statistics" element={<OrganizerStatisticsPage />} />
          </Route>

          {/* UI Admin */}
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="concerts" element={<AdminConcertsPage />} />
            <Route path="venues" element={<AdminVenuesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="vouchers" element={<AdminVouchersPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>

          <Route path="*" element={<RoleAwareRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
