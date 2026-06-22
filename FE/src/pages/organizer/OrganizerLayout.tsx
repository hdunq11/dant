import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  IconChart,
  IconConcert,
  IconDashboard,
  IconLogout,
  IconOrder,
  IconSeat,
  IconTicket,
  IconVenue,
} from '../../components/portal/PortalIcons';
import '../admin/admin.css';
import './organizer.css';

const NAV = [
  { to: '/organizer', end: true, label: 'Dashboard', icon: IconDashboard },
  { to: '/organizer/concerts', label: 'My Concerts', icon: IconConcert },
  { to: '/organizer/seatmap', label: 'Seat Map', icon: IconSeat },
  { to: '/organizer/stage', label: 'Sân khấu', icon: IconVenue },
  { to: '/organizer/tickets', label: 'Tickets', icon: IconTicket },
  { to: '/organizer/orders', label: 'Orders', icon: IconOrder },
  { to: '/organizer/statistics', label: 'Statistics', icon: IconChart },
];

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || 'O').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function OrganizerLayout() {
  const { user, logout } = useAuth();
  const company = user?.organizer_profile?.company_name;
  const displayName = user?.full_name ?? user?.email ?? 'Organizer';

  return (
    <div className="admin-shell organizer-shell">
      <aside className="admin-sidebar organizer-sidebar">
        <div className="admin-sidebar__head">
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__logo">OP</span>
            <span>Organizer Portal</span>
          </div>
          {company ? <div className="organizer-sidebar__company">{company}</div> : null}
          <p className="admin-sidebar__sub">Quản lý sự kiện & bán vé</p>
        </div>
        <nav className="admin-sidebar__nav" aria-label="Organizer navigation">
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
              <span className="admin-user-chip__role"> · Nhà tổ chức</span>
            </span>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
