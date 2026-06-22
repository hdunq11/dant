import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizerApi } from '../../api/organizerApi';
import { PageHeader } from '../../components/portal/PageHeader';
import { QuickAction } from '../../components/portal/QuickAction';
import {
  IconChart,
  IconConcert,
  IconOrder,
  IconPlus,
  IconSeat,
  IconTicket,
} from '../../components/portal/PortalIcons';
import { StatCard } from '../../components/portal/StatCard';
import { getApiErrorMessage } from '../../context/AuthContext';
import { formatVnd } from '../../utils/format';

export function OrganizerDashboardPage() {
  const [stats, setStats] = useState({
    concerts_total: 0,
    concerts_draft: 0,
    concerts_pending_review: 0,
    concerts_published: 0,
    orders_total: 0,
    ticket_revenue: 0,
    platform_fees: 0,
    revenue_total: 0,
    tickets_sold: 0,
    venues_owned: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .getDashboard()
      .then((res) => setStats(res.data))
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Theo dõi concert, doanh thu và tiến độ duyệt sự kiện của bạn."
      />
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="portal-stats">
        <StatCard label="Tổng concert" value={stats.concerts_total} tone="info" icon={<IconConcert size={18} />} />
        <StatCard label="Đang bán" value={stats.concerts_published} tone="success" icon={<IconTicket size={18} />} />
        <StatCard label="Chờ duyệt" value={stats.concerts_pending_review} tone="warning" icon={<IconConcert size={18} />} />
        <StatCard label="Đơn thanh toán" value={stats.orders_total} tone="primary" icon={<IconOrder size={18} />} />
        <StatCard label="Doanh thu vé" value={formatVnd(stats.ticket_revenue)} tone="neutral" icon={<IconChart size={18} />} />
        <StatCard label="Phí nền tảng" value={formatVnd(stats.platform_fees)} tone="warning" icon={<IconChart size={18} />} />
        <StatCard label="Thực nhận" value={formatVnd(stats.revenue_total)} tone="success" icon={<IconChart size={18} />} />
        <StatCard label="Vé đã bán" value={stats.tickets_sold} tone="neutral" icon={<IconTicket size={18} />} />
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h2>Bắt đầu nhanh</h2>
        <div className="portal-steps">
          <div className="portal-step">
            Thiết lập <Link to="/organizer/seatmap">Seat Map</Link> — thêm khu ghế và giá vé cho venue của bạn.
          </div>
          <div className="portal-step">
            <Link to="/organizer/concerts/create">Tạo concert</Link> — chọn venue, nghệ sĩ và thời gian diễn.
          </div>
          <div className="portal-step">
            Gửi duyệt → Admin approve → Publish để mở bán.
          </div>
          <div className="portal-step">
            Theo dõi <Link to="/organizer/orders">Orders</Link> và <Link to="/organizer/statistics">Statistics</Link>.
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2>Tác vụ nhanh</h2>
        <div className="portal-quick-actions">
          <QuickAction
            to="/organizer/concerts/create"
            title="Tạo concert mới"
            description="Thiết lập sự kiện và gửi duyệt"
            icon={<IconPlus size={20} />}
          />
          <QuickAction
            to="/organizer/seatmap"
            title="Seat Map"
            description="Quản lý khu ghế và giá vé"
            icon={<IconSeat size={20} />}
          />
          <QuickAction
            to="/organizer/tickets"
            title="Tickets"
            description="Xem tình trạng vé theo concert"
            icon={<IconTicket size={20} />}
          />
          <QuickAction
            to="/organizer/statistics"
            title="Statistics"
            description="Doanh thu và hiệu suất bán vé"
            icon={<IconChart size={20} />}
          />
        </div>
      </div>
    </div>
  );
}
