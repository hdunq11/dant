import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { getApiErrorMessage, useAuth } from '../context/AuthContext';
import './ProfilePage.css';

const PAYMENT_INFO = `Thanh toán qua MoMo, VNPAY hoặc thẻ quốc tế.\nPhí đặt chỗ: 20.000đ/đơn.\nVé giấy: +30.000đ.\nBảo hiểm: 50.000đ/ghế.`;
const TERMS = `Bằng việc sử dụng website, bạn đồng ý với điều khoản đặt vé và chính sách hoàn/hủy theo quy định nhà tổ chức.`;

export function ProfilePage() {
  const { user } = useAuth();
  const [orderCount, setOrderCount] = useState(0);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    Promise.all([concertApi.getMyOrders(), concertApi.getFavorites()])
      .then(([orders, favs]) => {
        setOrderCount((orders.data ?? []).length);
        setFavCount((favs.data ?? []).length);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="container profile-layout">
        <aside className="profile-card card">
          <div className="avatar">{(user?.full_name ?? 'U')[0].toUpperCase()}</div>
          <h2>{user?.full_name}</h2>
          <p className="email">{user?.email}</p>
          <div className="stats">
            <div><strong>{orderCount}</strong><span>Đơn vé</span></div>
            <div><strong>{favCount}</strong><span>Yêu thích</span></div>
          </div>
        </aside>
        <div className="profile-main">
          <Link to="/profile/edit" className="menu-item card">
            Chỉnh sửa hồ sơ <span>›</span>
          </Link>
          <Link to="/info/payment" className="menu-item card">
            Thông tin thanh toán <span>›</span>
          </Link>
          <Link to="/info/terms" className="menu-item card">
            Điều khoản sử dụng <span>›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Chỉnh sửa hồ sơ</h1>
        {msg ? (
          <div className={`alert ${msg.includes('Lỗi') || msg.includes('lỗi') ? 'alert-error' : 'alert-success'}`}>
            {msg}
          </div>
        ) : null}
        <form className="card" style={{ padding: 24 }} onSubmit={save}>
          <div className="field">
            <label htmlFor="fn">Họ và tên</label>
            <input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="av">Avatar URL</label>
            <input id="av" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function InfoPage({ kind }: { kind: 'payment' | 'terms' }) {
  const content = kind === 'payment' ? PAYMENT_INFO : TERMS;
  const title = kind === 'payment' ? 'Thông tin thanh toán' : 'Điều khoản sử dụng';
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title">{title}</h1>
        <div className="card info-body">{content.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>
        <Link to="/profile" className="back-link" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          ← Quay lại
        </Link>
      </div>
    </div>
  );
}
