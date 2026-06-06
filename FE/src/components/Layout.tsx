import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export function Layout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span className="brand-icon">🎫</span>
            <span>Concert Booking</span>
          </Link>
          <nav className="nav">
            <NavLink to="/" end>
              Khám phá
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin">Quản trị</NavLink>
            )}
            {isAuthenticated && (
              <>
                <NavLink to="/tickets">Vé của tôi</NavLink>
                <NavLink to="/favorites">Yêu thích</NavLink>
                <NavLink to="/profile">Cá nhân</NavLink>
              </>
            )}
          </nav>
          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <span className="user-pill">{user?.full_name ?? user?.email}</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline btn-sm">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>© 2026 Concert Booking — Đặt vé concert trực tuyến</p>
        </div>
      </footer>
    </div>
  );
}
