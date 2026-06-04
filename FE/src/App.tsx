import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConcertDetailPage } from './pages/ConcertDetailPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { EditProfilePage, InfoPage, ProfilePage } from './pages/ProfilePage';
import { SeatSelectionPage } from './pages/SeatSelectionPage';
import { TicketsPage } from './pages/TicketsPage';
import { Spinner } from './components/Spinner';
import { useAuth } from './context/AuthContext';

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="concerts/:id" element={<ConcertDetailPage />} />
            <Route
              path="concerts/:id/seats"
              element={
                <ProtectedRoute>
                  <SeatSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="concerts/:id/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/:orderId/success"
              element={
                <ProtectedRoute>
                  <ConfirmationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="tickets"
              element={
                <ProtectedRoute>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile/edit"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="info/payment" element={<InfoPage kind="payment" />} />
            <Route path="info/terms" element={<InfoPage kind="terms" />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
