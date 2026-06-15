import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { EmptyState } from '../../components/EmptyState';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Order } from '../../types';
import { formatDateTime, formatVnd } from '../../utils/format';

export function AdminOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders();
      setItems(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusClass = (s?: string) => {
    if (s === 'paid') return 'status-badge status-badge--paid';
    if (s === 'cancelled') return 'status-badge status-badge--cancelled';
    return 'status-badge status-badge--pending';
  };

  return (
    <div>
      <h1 className="page-title">Đơn hàng</h1>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-card admin-table-wrap">
        {loading ? <p>Đang tải...</p> : items.length ? (
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Concert</th><th>Tổng</th><th>Trạng thái</th><th>Ngày tạo</th></tr>
            </thead>
            <tbody>
              {items.slice(0, 80).map((o) => (
                <tr key={o.id}>
                  <td style={{ fontSize: '0.75rem' }}>{o.id?.slice(0, 8)}…</td>
                  <td>{o.concert_title}</td>
                  <td>{formatVnd(o.total_price)}</td>
                  <td><span className={statusClass(o.status)}>{o.status}</span></td>
                  <td>{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            compact
            icon="order"
            title="Chưa có đơn hàng"
            description="Đơn đặt vé từ người dùng sẽ hiển thị tại đây."
          />
        )}
      </div>
    </div>
  );
}
