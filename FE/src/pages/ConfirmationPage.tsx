import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { Spinner } from '../components/Spinner';
import type { Order } from '../types';
import { formatDateTime, formatVnd, orderStatusLabel } from '../utils/format';
import './ConfirmationPage.css';

export function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const res = await concertApi.getMyOrders();
        setOrder((res.data ?? []).find((o) => o.id === orderId) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) return <Spinner />;

  return (
    <div className="page confirm-page">
      <div className="container confirm-card card">
        <div className="confirm-icon">✓</div>
        <h1>Đặt vé thành công!</h1>
        <p className="order-code">Mã đơn: {orderId?.slice(0, 8).toUpperCase()}</p>
        {order && (
          <div className="order-info">
            <p className="concert-name">{order.concert_title}</p>
            <p>{orderStatusLabel(order.status)} · {formatDateTime(order.created_at)}</p>
            <p className="total">{formatVnd(order.total_price)}</p>
          </div>
        )}
        <div className="qr-box">
          <span>QR-{orderId?.slice(0, 12)}</span>
          <small>Hiển thị mã tại cổng vào (demo)</small>
        </div>
        <div className="confirm-actions">
          <Link to="/tickets" className="btn btn-primary">
            Xem vé của tôi
          </Link>
          <Link to="/" className="btn btn-outline">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
