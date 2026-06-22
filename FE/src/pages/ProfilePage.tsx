import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { ProfileShell } from '../components/ProfileShell';
import { IconHeart, IconPayment, IconTerms, IconTicket } from '../components/fan/FanIcons';
import { getApiErrorMessage, useAuth } from '../context/AuthContext';
import type { Concert, Order } from '../types';
import { extractList } from '../utils/apiData';
import './ProfilePage.css';

const PAYMENT_INFO = `Thanh toán qua PayPal Sandbox (tài khoản test, không trừ tiền thật).
Giá vé hiển thị khi checkout đã bao gồm tiền ghế; tuỳ chọn thêm vé giấy (+30.000đ) hoặc bảo hiểm (+50.000đ/ghế).
Phí dịch vụ nền tảng được thỏa thuận với nhà tổ chức, không cộng thêm phí cố định lên người mua.`;
const TERMS = `Bằng việc sử dụng website, bạn đồng ý với điều khoản đặt vé và chính sách hoàn/hủy theo quy định nhà tổ chức.`;

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [orderCount, setOrderCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setAvatarUrl(user?.avatar_url ?? '');
    setAvatarBroken(false);
  }, [user]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarUrl]);

  useEffect(() => {
    Promise.all([concertApi.getMyOrders(), concertApi.getFavorites()])
      .then(([orders, favs]) => {
        setOrderCount(extractList<Order>(orders.data).length);
        setFavCount(extractList<Concert>(favs.data).length);
      })
      .catch(() => {});
  }, []);

  const displayAvatar = avatarUrl.trim() || user?.avatar_url || '';
  const showAvatarImg = Boolean(displayAvatar) && !avatarBroken;
  const avatarInitials = useMemo(() => initials(fullName || user?.full_name, user?.email), [fullName, user]);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await concertApi.updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      await refreshUser();
      setMsg('Đã cập nhật hồ sơ.');
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPasswordLoading(true);
    try {
      await concertApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('Đã đổi mật khẩu thành công.');
    } catch (err) {
      setPasswordMsg(getApiErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  const firstName = (user?.full_name ?? 'bạn').split(' ')[0];

  return (
    <div className="page profile-page">
      <div className="container profile-page__inner">
        <section className="profile-hero">
          <div className="profile-hero__avatar" aria-hidden>
            {showAvatarImg ? (
              <img src={displayAvatar} alt="" onError={() => setAvatarBroken(true)} />
            ) : (
              <span>{avatarInitials}</span>
            )}
          </div>
          <div className="profile-hero__text">
            <p className="profile-hero__eyebrow">Tài khoản cá nhân</p>
            <h1>Xin chào, {firstName}</h1>
            <p className="profile-hero__email">{user?.email}</p>
            {memberSince ? <span className="profile-hero__badge">Thành viên từ {memberSince}</span> : null}
          </div>
        </section>

        <div className="profile-layout">
          <aside className="profile-sidebar">
            <nav className="profile-nav" aria-label="Tóm tắt tài khoản">
              <Link to="/tickets" className="profile-nav__item">
                <span className="profile-nav__icon">
                  <IconTicket size={18} />
                </span>
                <span className="profile-nav__label">
                  <strong>{orderCount}</strong>
                  Đơn vé
                </span>
              </Link>
              <Link to="/favorites" className="profile-nav__item">
                <span className="profile-nav__icon profile-nav__icon--heart">
                  <IconHeart size={18} />
                </span>
                <span className="profile-nav__label">
                  <strong>{favCount}</strong>
                  Yêu thích
                </span>
              </Link>
            </nav>

            <div className="profile-sidebar__links">
              <Link to="/profile/payment" className="profile-link-row">
                <IconPayment size={16} />
                Thanh toán
              </Link>
              <Link to="/profile/terms" className="profile-link-row">
                <IconTerms size={16} />
                Điều khoản
              </Link>
            </div>
          </aside>

          <div className="profile-content">
            {msg ? (
              <div className={`profile-toast ${msg.includes('lỗi') || msg.includes('Lỗi') ? 'profile-toast--error' : 'profile-toast--ok'}`}>
                {msg}
              </div>
            ) : null}

            <section className="profile-card">
              <header className="profile-card__head">
                <h2>Hồ sơ của bạn</h2>
                <p>Cập nhật tên hiển thị và ảnh đại diện.</p>
              </header>

              <form className="profile-form" onSubmit={save}>
                <div className="profile-form__preview">
                  <div className="profile-form__avatar-preview" aria-hidden>
                    {showAvatarImg ? (
                      <img src={displayAvatar} alt="" onError={() => setAvatarBroken(true)} />
                    ) : (
                      <span>{avatarInitials}</span>
                    )}
                  </div>
                  <div className="profile-form__preview-meta">
                    <strong>{fullName.trim() || user?.full_name || 'Chưa có tên'}</strong>
                    <span>{user?.email}</span>
                  </div>
                </div>

                <div className="profile-form__fields">
                  <div className="profile-field">
                    <label htmlFor="fn">Họ và tên</label>
                    <input
                      id="fn"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      autoComplete="name"
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" value={user?.email ?? ''} readOnly className="is-readonly" />
                  </div>
                  <div className="profile-field profile-field--full">
                    <label htmlFor="av">Ảnh đại diện (URL)</label>
                    <input
                      id="av"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      inputMode="url"
                    />
                    <small>Dán link ảnh vuông — xem trước bên trên.</small>
                  </div>
                </div>

                <div className="profile-form__actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </section>

            <section className="profile-card profile-card--muted">
              <header className="profile-card__head">
                <h2>Bảo mật</h2>
                <p>Đổi mật khẩu đăng nhập tài khoản của bạn.</p>
              </header>

              {passwordMsg ? (
                <div
                  className={`profile-toast ${
                    passwordMsg.includes('thành công') ? 'profile-toast--ok' : 'profile-toast--error'
                  }`}
                >
                  {passwordMsg}
                </div>
              ) : null}

              <dl className="profile-security profile-security--compact">
                <div className="profile-security__row">
                  <dt>Email đăng nhập</dt>
                  <dd>{user?.email}</dd>
                </div>
              </dl>

              <form className="profile-form profile-form--password" onSubmit={changePassword}>
                <div className="profile-form__fields">
                  <div className="profile-field profile-field--full">
                    <label htmlFor="current-pw">Mật khẩu hiện tại</label>
                    <input
                      id="current-pw"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="new-pw">Mật khẩu mới</label>
                    <input
                      id="new-pw"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="confirm-pw">Xác nhận mật khẩu mới</label>
                    <input
                      id="confirm-pw"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="profile-form__actions">
                  <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                    {passwordLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditProfilePage() {
  return <Navigate to="/profile" replace />;
}

export function InfoPage({ kind }: { kind: 'payment' | 'terms' }) {
  const content = kind === 'payment' ? PAYMENT_INFO : TERMS;
  const title = kind === 'payment' ? 'Thông tin thanh toán' : 'Điều khoản sử dụng';
  const subtitle =
    kind === 'payment'
      ? 'Các phương thức thanh toán khi đặt vé.'
      : 'Quy định sử dụng dịch vụ đặt vé concert.';

  return (
    <ProfileShell title={title} subtitle={subtitle}>
      <div className="profile-info">
        {content.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </ProfileShell>
  );
}
