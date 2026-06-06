import { useCallback, useEffect, useState } from 'react';
import { concertApi } from '../api/concertApi';
import { ProfileShell } from '../components/ProfileShell';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { Order } from '../types';
import { extractList } from '../utils/apiData';
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
      setOrders(extractList<Order>(res.data));
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
    <ProfileShell
      active="tickets"
      title="Vé của tôi"
      subtitle="Theo dõi trạng thái và chi tiết các đơn đặt vé của bạn."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? (
        <Spinner />
      ) : orders.length ? (
        <div className="order-list">
          {orders.map((o) => (
            <article key={o.id} className="order-card">
              <div className="order-card__head">
                <div>
                  <span className="order-card__id">#{o.id?.slice(0, 8).toUpperCase()}</span>
                  <h3>{o.concert_title ?? 'Concert'}</h3>
                  <p>{formatDateTime(o.created_at)}</p>
                </div>
                <span className={`order-status order-status--${o.status}`}>{orderStatusLabel(o.status)}</span>
              </div>

              <div className="order-card__body">
                <div className="order-block">
                  <h4>Thanh toán</h4>
                  <p>{o.payment_method ?? 'Chưa xác định'}</p>
                  {o.delivery_method ? <p>Giao vé: {o.delivery_method}</p> : null}
                </div>
                <div className="order-block">
                  <h4>Chi phí</h4>
                  {o.seat_subtotal != null ? <p>Ghế: {formatVnd(o.seat_subtotal)}</p> : null}
                  {o.booking_fee ? <p>Phí đặt chỗ: {formatVnd(o.booking_fee)}</p> : null}
                  {o.discount_amount ? <p>Giảm giá: −{formatVnd(o.discount_amount)}</p> : null}
                  <p className="order-total">Tổng: <strong>{formatVnd(o.total_price)}</strong></p>
                </div>
              </div>

              <div className="order-card__foot">
                {o.status === 'paid' && (
                  <span className="order-qr">Mã vé · {o.id?.slice(0, 12)}</span>
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
        <p className="empty">Chưa có vé nào. Hãy khám phá concert và đặt vé ngay!</p>
      )}
    </ProfileShell>
  );
}
