import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconExplore, IconHeart, IconTicket, IconUser } from './fan/FanIcons';
import './Layout.css';

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/** UI dành cho khách & fan — không hiển thị link admin/organizer */
export function Layout() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden>CB</span>
            <span className="brand-text">
              <strong>Concert Booking</strong>
              <small>Đặt vé · Xem VR</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Điều hướng chính">
            <NavLink to="/" end>
              <IconExplore />
              Khám phá
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/tickets">
                  <IconTicket />
                  Vé của tôi
                </NavLink>
                <NavLink to="/favorites">
                  <IconHeart />
                  Yêu thích
                </NavLink>
                <NavLink to="/profile">
                  <IconUser />
                  Cá nhân
                </NavLink>
              </>
            )}
          </nav>
          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="user-chip">
                  <span className="user-chip__avatar">{initials(user?.full_name, user?.email)}</span>
                  <span className="user-chip__name">{user?.full_name ?? user?.email}</span>
                </Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
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
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <span className="brand-mark brand-mark--sm">CB</span>
            <span>Concert Booking</span>
          </div>
          <p className="site-footer__copy">© 2026 Concert Booking — Đặt vé concert trực tuyến an toàn</p>
          <div className="site-footer__links">
            <Link to="/info/terms">Điều khoản</Link>
            <Link to="/info/payment">Thanh toán</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
