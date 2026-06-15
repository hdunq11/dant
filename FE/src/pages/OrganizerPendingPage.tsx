import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export function OrganizerPendingPage() {
  const { user, logout } = useAuth();
  const profile = user?.organizer_profile;
  const status = profile?.status ?? 'pending';

  if (status === 'rejected') {
    return (
      <div className="page auth-page">
        <div className="auth-card card auth-card--organizer">
          <div className="auth-status auth-status--rejected">Bị từ chối</div>
          <h1>Hồ sơ tổ chức chưa được duyệt</h1>
          <p className="auth-sub">
            <strong>{profile?.company_name}</strong> chưa đáp ứng yêu cầu hợp tác.
          </p>
          {profile?.rejection_reason ? (
            <p className="auth-organizer-note">{profile.rejection_reason}</p>
          ) : (
            <p className="auth-organizer-note">Vui lòng liên hệ admin để biết thêm chi tiết.</p>
          )}
          <button type="button" className="btn btn-outline btn-block" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <div className="auth-card card auth-card--organizer">
        <div className="auth-status auth-status--pending">Chờ duyệt</div>
        <h1>Đăng ký tổ chức thành công</h1>
        <p className="auth-sub">
          Hồ sơ <strong>{profile?.company_name}</strong> đang chờ admin xác minh.
        </p>
        <ul className="auth-pending-steps">
          <li className="done">Gửi thông tin doanh nghiệp</li>
          <li className="active">Admin duyệt hồ sơ tổ chức</li>
          <li>Sau khi duyệt: vào Organizer Portal → tạo concert</li>
        </ul>
        <p className="auth-organizer-note">
          Tài khoản doanh nghiệp chỉ dùng khu vực tổ chức sự kiện. Sau khi được duyệt, bạn sẽ tự động vào Organizer Portal khi đăng nhập.
        </p>
        <button type="button" className="btn btn-outline btn-block" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
