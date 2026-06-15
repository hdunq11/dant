import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage, useAuth } from '../context/AuthContext';
import { resolvePostLoginPath } from '../utils/authRedirect';
import './AuthPage.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(resolvePostLoginPath(user, from), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card card">
        <div className="auth-card__logo">
          <span className="auth-card__mark">CB</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Concert Booking</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tài khoản fan</span>
          </div>
        </div>
        <h1>Đăng nhập</h1>
        <p className="auth-sub">Chào mừng trở lại Concert Booking</p>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          <br />
          <Link to="/register" state={{ business: true }} className="auth-footer__business">
            Đăng ký tổ chức sự kiện (doanh nghiệp)
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialBusiness = (location.state as { business?: boolean } | null)?.business ?? false;

  const [isBusiness, setIsBusiness] = useState(initialBusiness);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        email,
        password,
        password_confirm: password,
        full_name: fullName,
        register_as_organizer: isBusiness,
        company_name: isBusiness ? companyName : undefined,
        business_license: isBusiness ? businessLicense : undefined,
        contact_phone: isBusiness ? contactPhone : undefined,
      });
      navigate(isBusiness ? '/organizer/pending' : '/');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className={`auth-card card ${isBusiness ? 'auth-card--organizer' : ''}`}>
        <div className="auth-card__logo">
          <span className="auth-card__mark">CB</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Concert Booking</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {isBusiness ? 'Đăng ký doanh nghiệp' : 'Tài khoản fan'}
            </span>
          </div>
        </div>
        <h1>{isBusiness ? 'Đăng ký tổ chức sự kiện' : 'Tạo tài khoản'}</h1>
        <p className="auth-sub">
          {isBusiness
            ? 'Đăng ký doanh nghiệp để hợp tác bán vé concert trên nền tảng ConcertVR'
            : 'Bắt đầu đặt vé concert ngay hôm nay'}
        </p>

        <label className="auth-business-toggle">
          <input
            type="checkbox"
            checked={isBusiness}
            onChange={(e) => setIsBusiness(e.target.checked)}
          />
          <span>
            <strong>Bạn là doanh nghiệp</strong>
            <small>Đăng ký với tư cách nhà tổ chức sự kiện</small>
          </span>
        </label>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={submit}>
          {isBusiness ? (
            <>
              <div className="auth-organizer-note">
                Hồ sơ sẽ được gửi tới admin duyệt trước khi bạn có thể tạo và publish concert.
              </div>
              <div className="field">
                <label htmlFor="company">Tên doanh nghiệp / tổ chức</label>
                <input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="VD: ABC Entertainment Co., Ltd"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="license">Mã số đăng ký kinh doanh</label>
                <input
                  id="license"
                  value={businessLicense}
                  onChange={(e) => setBusinessLicense(e.target.value)}
                  placeholder="VD: 0123456789"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="rep-name">Người đại diện</label>
                <input
                  id="rep-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Họ và tên người liên hệ"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Số điện thoại liên hệ</label>
                <input
                  id="phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="VD: 0901234567"
                />
              </div>
            </>
          ) : (
            <div className="field">
              <label htmlFor="name">Họ và tên</label>
              <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}

          <div className="field">
            <label htmlFor="reg-email">Email {isBusiness ? 'doanh nghiệp' : ''}</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="reg-pass">Mật khẩu</label>
            <input
              id="reg-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Đang gửi...' : isBusiness ? 'Gửi đăng ký tổ chức' : 'Đăng ký'}
          </button>
        </form>
        <p className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
