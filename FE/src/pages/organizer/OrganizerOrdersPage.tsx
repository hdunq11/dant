import { useCallback, useEffect, useState } from 'react';
import { organizerApi, type OrganizerOrder } from '../../api/organizerApi';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Concert } from '../../types';
import { formatDateTime, formatVnd } from '../../utils/format';

export function OrganizerOrdersPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [concertId, setConcertId] = useState('');
  const [items, setItems] = useState<OrganizerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConcerts = useCallback(async () => {
    const res = await organizerApi.getConcerts();
    const data = res.data as Concert[] | { results?: Concert[] };
    setConcerts(Array.isArray(data) ? data : data.results ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApi.getOrders(concertId || undefined);
      setItems(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [concertId]);

  useEffect(() => { loadConcerts(); }, [loadConcerts]);
  useEffect(() => { load(); }, [load]);

  const statusClass = (s?: string) => {
    if (s === 'paid') return 'status-badge status-badge--paid';
    if (s === 'cancelled') return 'status-badge status-badge--cancelled';
    return 'status-badge status-badge--pending';
  };

  return (
    <div>
      <h1 className="page-title">Orders</h1>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-toolbar">
        <label>
          Lọc concert{' '}
          <select value={concertId} onChange={(e) => setConcertId(e.target.value)}>
            <option value="">Tất cả</option>
            {concerts.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-card admin-table-wrap">
        {loading ? (
          <LoadingState compact label="Đang tải đơn hàng..." />
        ) : items.length ? (
          <table className="admin-table">
            <thead>
              <tr><th>Concert</th><th>Khách</th><th>Tổng</th><th>Trạng thái</th><th>Ngày</th></tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td>{o.concert_title}</td>
                  <td>{o.buyer_name ?? o.buyer_email}</td>
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
            description="Khi fan mua vé concert của bạn, đơn hàng sẽ hiện tại đây."
          />
        )}
      </div>
    </div>
  );
}
