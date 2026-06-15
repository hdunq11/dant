import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  IconChart,
  IconConcert,
  IconDashboard,
  IconLogout,
  IconOrder,
  IconUsers,
  IconVenue,
  IconVoucher,
} from '../../components/portal/PortalIcons';
import './admin.css';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: IconDashboard },
  { to: '/admin/users', label: 'Users', icon: IconUsers },
  { to: '/admin/concerts', label: 'Concerts', icon: IconConcert },
  { to: '/admin/venues', label: 'Venues', icon: IconVenue },
  { to: '/admin/orders', label: 'Orders', icon: IconOrder },
  { to: '/admin/vouchers', label: 'Vouchers', icon: IconVoucher },
  { to: '/admin/reports', label: 'Reports', icon: IconChart },
];

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || 'A').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const displayName = user?.full_name ?? user?.email ?? 'Admin';

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__head">
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__logo">CV</span>
            <span>Admin Panel</span>
          </div>
          <p className="admin-sidebar__sub">Quản trị nền tảng ConcertVR</p>
        </div>
        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          <span className="admin-sidebar__nav-label">Menu</span>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="admin-sidebar__foot">
          <button type="button" className="btn btn-outline btn-sm btn-block" onClick={logout}>
            <IconLogout size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div className="admin-user-chip">
            <span className="admin-user-chip__avatar">{initials(user?.full_name, user?.email)}</span>
            <span>
              {displayName}
              <span className="admin-user-chip__role"> · Admin</span>
            </span>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
