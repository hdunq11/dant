import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { PageHeader } from '../../components/portal/PageHeader';
import { QuickAction } from '../../components/portal/QuickAction';
import {
  IconChart,
  IconConcert,
  IconOrder,
  IconUsers,
  IconVenue,
  IconVoucher,
} from '../../components/portal/PortalIcons';
import { StatCard } from '../../components/portal/StatCard';
import { getApiErrorMessage } from '../../context/AuthContext';
import { formatVnd } from '../../utils/format';

export function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users_total: 0,
    organizers_pending: 0,
    concerts_pending_review: 0,
    concerts_published: 0,
    venues_total: 0,
    orders_total: 0,
    orders_paid: 0,
    ticket_gmv: 0,
    commission_total: 0,
    revenue_total: 0,
    vouchers_active: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((res) => setStats(res.data))
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan hoạt động nền tảng — duyệt đối tác, concert và theo dõi doanh thu."
      />
      {error ? <div className="alert alert-error">{error}</div> : null}

      {(stats.organizers_pending > 0 || stats.concerts_pending_review > 0) && (
        <div className="admin-alert-pending">
          {stats.organizers_pending > 0 ? (
            <Link to="/admin/users?organizer_status=pending" className="admin-alert-card">
              <strong>{stats.organizers_pending}</strong>
              Doanh nghiệp chờ duyệt
            </Link>
          ) : null}
          {stats.concerts_pending_review > 0 ? (
            <Link to="/admin/concerts?status=pending_review" className="admin-alert-card">
              <strong>{stats.concerts_pending_review}</strong>
              Concert chờ duyệt
            </Link>
          ) : null}
        </div>
      )}

      <div className="portal-stats">
        <StatCard label="Users" value={stats.users_total} tone="info" icon={<IconUsers size={18} />} />
        <StatCard label="Concert đang bán" value={stats.concerts_published} tone="success" icon={<IconConcert size={18} />} />
        <StatCard label="Venues" value={stats.venues_total} tone="neutral" icon={<IconVenue size={18} />} />
        <StatCard label="Đơn đã thanh toán" value={stats.orders_paid} tone="primary" icon={<IconOrder size={18} />} />
        <StatCard label="GMV vé" value={formatVnd(stats.ticket_gmv)} tone="neutral" icon={<IconChart size={18} />} />
        <StatCard label="Chiết khấu (admin)" value={formatVnd(stats.commission_total)} tone="success" icon={<IconChart size={18} />} />
        <StatCard label="Voucher active" value={stats.vouchers_active} tone="warning" icon={<IconVoucher size={18} />} />
      </div>

      <div className="admin-card">
        <h2>Tác vụ nhanh</h2>
        <div className="portal-quick-actions">
          <QuickAction
            to="/admin/users"
            title="Duyệt doanh nghiệp"
            description="Xem và phê duyệt hồ sơ organizer mới"
            icon={<IconUsers size={20} />}
          />
          <QuickAction
            to="/admin/concerts"
            title="Duyệt concert"
            description="Review, approve và publish sự kiện"
            icon={<IconConcert size={20} />}
          />
          <QuickAction
            to="/admin/orders"
            title="Đơn hàng"
            description="Theo dõi toàn bộ giao dịch trên hệ thống"
            icon={<IconOrder size={20} />}
          />
          <QuickAction
            to="/admin/reports"
            title="Báo cáo"
            description="Doanh thu, concert và thống kê tổng hợp"
            icon={<IconChart size={20} />}
          />
        </div>
      </div>
    </div>
  );
}
