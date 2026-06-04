import { useCallback, useEffect, useState } from 'react';
import { concertApi } from '../api/concertApi';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { Order } from '../types';
import { formatDateTime, formatVnd, orderStatusLabel } from '../utils/format';
import './TicketsPage.css';

export function TicketsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await concertApi.getMyOrders();
      setOrders(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (id: string) => {
    if (!confirm('Hủy đơn chờ thanh toán?')) return;
    try {
      await concertApi.cancelOrder(id);
      load();
    } catch (e) {
      alert(getApiErrorMessage(e));
    }
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Vé của tôi</h1>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {loading ? (
          <Spinner />
        ) : orders.length ? (
          <div className="ticket-list">
            {orders.map((o) => (
              <article key={o.id} className="ticket-card card">
                <div className="ticket-card__main">
                  <h3>{o.concert_title ?? 'Concert'}</h3>
                  <p>{formatDateTime(o.created_at)}</p>
                  <span className={`status status--${o.status}`}>{orderStatusLabel(o.status)}</span>
                  <p className="price">{formatVnd(o.total_price)}</p>
                </div>
                <div className="ticket-card__side">
                  {o.status === 'paid' && (
                    <div className="qr-mini">QR-{o.id?.slice(0, 10)}</div>
                  )}
                  {o.status === 'pending' && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => cancel(o.id!)}>
                      Hủy đơn
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty">Chưa có vé nào.</p>
        )}
      </div>
    </div>
  );
}
