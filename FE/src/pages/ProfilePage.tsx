import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { ProfileShell } from '../components/ProfileShell';
import { getApiErrorMessage, useAuth } from '../context/AuthContext';
import type { Concert, Order } from '../types';
import { extractList } from '../utils/apiData';
import './ProfilePage.css';

const PAYMENT_INFO = `Thanh toán qua PayPal Sandbox (tài khoản test, không trừ tiền thật).\nPhí đặt chỗ: 20.000đ/đơn.\nVé giấy: +30.000đ.\nBảo hiểm: 50.000đ/ghế.`;
const TERMS = `Bằng việc sử dụng website, bạn đồng ý với điều khoản đặt vé và chính sách hoàn/hủy theo quy định nhà tổ chức.`;

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [orderCount, setOrderCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setAvatarUrl(user?.avatar_url ?? '');
  }, [user]);

  useEffect(() => {
    Promise.all([concertApi.getMyOrders(), concertApi.getFavorites()])
      .then(([orders, favs]) => {
        setOrderCount(extractList<Order>(orders.data).length);
        setFavCount(extractList<Concert>(favs.data).length);
      })
      .catch(() => {});
  }, []);

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

  const firstName = (user?.full_name ?? 'bạn').split(' ')[0];

  return (
    <ProfileShell
      active="profile"
      title={`Xin chào ${firstName},`}
      subtitle="Tại đây bạn có thể xem và chỉnh sửa thông tin tài khoản."
    >
      <div className="profile-stats">
        <div className="profile-stat">
          <strong>{orderCount}</strong>
          <span>Đơn vé</span>
        </div>
        <div className="profile-stat">
          <strong>{favCount}</strong>
          <span>Yêu thích</span>
        </div>
      </div>

      {msg ? (
        <div className={`alert ${msg.includes('lỗi') || msg.includes('Lỗi') ? 'alert-error' : 'alert-success'}`}>
          {msg}
        </div>
      ) : null}

      <section className="profile-section">
        <h2>Chỉnh sửa hồ sơ</h2>
        <form className="profile-form" onSubmit={save}>
          <div className="profile-form__grid">
            <div className="field">
              <label htmlFor="fn">Họ và tên</label>
              <input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" value={user?.email ?? ''} readOnly className="readonly" />
            </div>
            <div className="field profile-form__full">
              <label htmlFor="av">Ảnh đại diện (URL)</label>
              <input
                id="av"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="profile-form__actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>

      <section className="profile-section">
        <h2>Tài khoản đăng nhập</h2>
        <div className="profile-form__grid">
          <div className="field">
            <label>Tên đăng nhập</label>
            <div className="profile-readonly">
              <span className="profile-readonly__icon">👤</span>
              <input value={user?.email ?? ''} readOnly />
            </div>
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <div className="profile-readonly">
              <span className="profile-readonly__icon">🔒</span>
              <input type="password" value="••••••••••" readOnly />
            </div>
          </div>
        </div>
        <p className="profile-hint">Liên hệ quản trị viên nếu cần đổi mật khẩu.</p>
      </section>
    </ProfileShell>
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
      ? 'Các phương thức thanh toán và phí dịch vụ khi đặt vé.'
      : 'Quy định sử dụng dịch vụ đặt vé concert.';

  return (
    <ProfileShell active={kind === 'payment' ? 'payment' : 'terms'} title={title} subtitle={subtitle}>
      <div className="profile-info">
        {content.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </ProfileShell>
  );
}
