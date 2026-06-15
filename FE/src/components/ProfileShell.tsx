import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconHeart,
  IconLogout,
  IconPayment,
  IconTerms,
  IconTicket,
  IconUser,
} from './fan/FanIcons';
import './ProfileShell.css';

export type ProfileNav = 'profile' | 'tickets' | 'favorites' | 'payment' | 'terms';

interface ProfileShellProps {
  active: ProfileNav;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const NAV: { id: ProfileNav; to: string; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: 'profile', to: '/profile', label: 'Hồ sơ', icon: IconUser },
  { id: 'tickets', to: '/tickets', label: 'Vé của tôi', icon: IconTicket },
  { id: 'favorites', to: '/favorites', label: 'Yêu thích', icon: IconHeart },
  { id: 'payment', to: '/info/payment', label: 'Thanh toán', icon: IconPayment },
  { id: 'terms', to: '/info/terms', label: 'Điều khoản', icon: IconTerms },
];

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function ProfileShell({ active, title, subtitle, children }: ProfileShellProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

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
              <div className="profile-sidebar__avatar">{initials(user?.full_name, user?.email)}</div>
            )}
            <strong>{user?.full_name ?? 'Khách'}</strong>
            <span>{user?.email}</span>
          </div>

          <nav className="profile-sidebar__nav" aria-label="Tài khoản">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={`profile-sidebar__link ${active === item.id ? 'active' : ''}`}
                >
                  <span className="profile-sidebar__icon" aria-hidden>
                    <Icon size={18} />
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
            {isAdmin ? (
              <NavLink to="/admin" className="profile-sidebar__link profile-sidebar__link--admin">
                <span className="profile-sidebar__icon" aria-hidden>⚙</span>
                Quản trị
              </NavLink>
            ) : null}
          </nav>

          <button type="button" className="profile-sidebar__logout" onClick={handleLogout}>
            <IconLogout size={18} />
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
