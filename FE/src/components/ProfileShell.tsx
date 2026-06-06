import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProfileShell.css';

export type ProfileNav = 'profile' | 'tickets' | 'favorites' | 'payment' | 'terms';

interface ProfileShellProps {
  active: ProfileNav;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const NAV: { id: ProfileNav; to: string; label: string; icon: string }[] = [
  { id: 'profile', to: '/profile', label: 'Hồ sơ', icon: '👤' },
  { id: 'tickets', to: '/tickets', label: 'Vé của tôi', icon: '🎫' },
  { id: 'favorites', to: '/favorites', label: 'Yêu thích', icon: '♥' },
  { id: 'payment', to: '/info/payment', label: 'Thanh toán', icon: '💳' },
  { id: 'terms', to: '/info/terms', label: 'Điều khoản', icon: '📋' },
];

export function ProfileShell({ active, title, subtitle, children }: ProfileShellProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.full_name ?? user?.email ?? 'U')[0].toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page profile-hub">
      <div className="container profile-hub__grid">
        <aside className="profile-sidebar card">
          <div className="profile-sidebar__user">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="profile-sidebar__avatar profile-sidebar__avatar--img" />
            ) : (
              <div className="profile-sidebar__avatar">{initial}</div>
            )}
            <strong>{user?.full_name ?? 'Khách'}</strong>
            <span>{user?.email}</span>
          </div>

          <nav className="profile-sidebar__nav">
            {NAV.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                className={`profile-sidebar__link ${active === item.id ? 'active' : ''}`}
              >
                <span className="profile-sidebar__icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
            {isAdmin ? (
              <NavLink to="/admin" className="profile-sidebar__link profile-sidebar__link--admin">
                <span className="profile-sidebar__icon" aria-hidden>
                  ⚙
                </span>
                Quản trị
              </NavLink>
            ) : null}
          </nav>

          <button type="button" className="profile-sidebar__logout" onClick={handleLogout}>
            <span aria-hidden>↪</span>
            Đăng xuất
          </button>
        </aside>

        <main className="profile-main card">
          <header className="profile-main__header">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
