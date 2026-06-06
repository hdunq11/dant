import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './admin.css';

const NAV = [
  { to: '/admin', end: true, label: 'Tổng quan' },
  { to: '/admin/concerts', label: 'Concert' },
  { to: '/admin/venues', label: 'Địa điểm' },
  { to: '/admin/artists', label: 'Nghệ sĩ' },
  { to: '/admin/zones', label: 'Khu ghế' },
  { to: '/admin/orders', label: 'Đơn hàng' },
  { to: '/admin/vouchers', label: 'Voucher' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">Admin Panel</div>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.label}
          </NavLink>
        ))}
        <div className="admin-sidebar__foot">
          <Link to="/">← Về trang chủ</Link>
          <button type="button" className="btn btn-outline btn-sm btn-block" onClick={logout} style={{ marginTop: 8 }}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div />
          <span className="admin-user">{user?.full_name ?? user?.email} · Quản trị</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
