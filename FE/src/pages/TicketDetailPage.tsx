import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { EmptyState } from '../components/EmptyState';
import { ProfileShell } from '../components/ProfileShell';
import { Spinner } from '../components/Spinner';
import { TicketQrCode } from '../components/TicketQrCode';
import { getApiErrorMessage } from '../context/AuthContext';
import type { Order } from '../types';
import {
  deliveryMethodLabel,
  formatConcertTimeRange,
  formatDate,
  formatVnd,
  orderStatusLabel,
  paymentMethodLabel,
} from '../utils/format';
import './TicketDetailPage.css';

function itemLabel(item: NonNullable<Order['items']>[number]): string {
  if (item.label) return item.label;
  const zone = item.zone_name ?? item.seat?.zone?.name ?? 'Ghế';
  const row = item.row ?? item.seat?.row_label;
  const num = item.number ?? item.seat?.seat_number;
  if (row && num != null) return `${zone} · Hàng ${row} · Ghế ${num}`;
  return zone;
}

export function TicketDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await concertApi.getMyOrderDetail(orderId);
      setOrder(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const venueLine = [order?.concert_venue_name, order?.concert_city].filter(Boolean).join(', ');
  const items = order?.items ?? [];
  const ticketTypes = items.length
    ? items.map(itemLabel).join(' · ')
    : 'Vé concert';

  return (
    <ProfileShell title="Chi tiết vé" subtitle="Thông tin vé điện tử và mã QR check-in.">
      <nav className="ticket-detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        <Link to="/tickets">Vé của tôi</Link>
        <span aria-hidden="true">›</span>
        <span>Chi tiết vé</span>
      </nav>

      {loading ? (
        <Spinner />
      ) : error || !order ? (
        <EmptyState
          icon="ticket"
          title="Không tìm thấy vé"
          description={error ?? 'Vé không tồn tại hoặc chưa thanh toán.'}
          action={{ label: 'Quay lại vé của tôi', to: '/tickets' }}
        />
      ) : (
        <article className="ticket-detail">
          <header className="ticket-detail__header">
            <h1>{order.concert_title ?? 'Concert'}</h1>
          </header>

          {order.concert_banner_url ? (
            <div className="ticket-detail__banner">
              <img src={order.concert_banner_url} alt="" />
            </div>
          ) : null}

          <div className="ticket-detail__main">
            <div className="ticket-detail__info">
              <dl className="ticket-detail__facts">
                <div>
                  <dt>Loại vé</dt>
                  <dd>{ticketTypes}</dd>
                </div>
                <div>
                  <dt>Thời gian</dt>
                  <dd>{formatConcertTimeRange(order.concert_start_time, order.concert_end_time)}</dd>
                </div>
                {venueLine ? (
                  <div>
                    <dt>Địa điểm</dt>
                    <dd>
                      {venueLine}
                      {order.concert_venue_address ? (
                        <span className="ticket-detail__address">{order.concert_venue_address}</span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {order.id ? (
              <div className="ticket-detail__qr">
                <TicketQrCode
                  orderId={order.id}
                  size={200}
                  hint="Quét mã tại cổng vào"
                />
              </div>
            ) : null}
          </div>

          <div className="ticket-detail__perforation" aria-hidden="true" />

          <div className="ticket-detail__order-id">
            <span className="ticket-detail__order-id-label">Đơn hàng</span>
            <strong>#{order.id?.slice(0, 8).toUpperCase()}</strong>
          </div>

          <div className="ticket-detail__meta-table">
            <div className="ticket-detail__meta-head">
              <span>Ngày tạo đơn</span>
              <span>Phương thức thanh toán</span>
              <span>Tình trạng đơn hàng</span>
            </div>
            <div className="ticket-detail__meta-row">
              <span>{formatDate(order.created_at)}</span>
              <span>{paymentMethodLabel(order.payment_method)}</span>
              <span className="ticket-detail__status-ok">{orderStatusLabel(order.status)}</span>
            </div>
          </div>

          <section className="ticket-detail__section">
            <h2>
              <span className="ticket-detail__section-icon" aria-hidden="true">👤</span>
              Thông tin người nhận
            </h2>
            <div className="ticket-detail__kv-table">
              <div className="ticket-detail__kv-row">
                <span>Tên</span>
                <span>{order.recipient_name || '—'}</span>
              </div>
              <div className="ticket-detail__kv-row">
                <span>Email</span>
                <span>{order.recipient_email || '—'}</span>
              </div>
            </div>
          </section>

          <section className="ticket-detail__section">
            <h2>
              <span className="ticket-detail__section-icon" aria-hidden="true">📋</span>
              Thông tin đơn hàng
            </h2>
            <div className="ticket-detail__items-table">
              <div className="ticket-detail__items-head">
                <span>Loại vé</span>
                <span>Số lượng</span>
                <span>Thành tiền</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="ticket-detail__items-row">
                  <span>
                    {itemLabel(item)}
                    <small>{formatVnd(item.price)}</small>
                  </span>
                  <span>1</span>
                  <span>{formatVnd(item.price)}</span>
                </div>
              ))}
              <div className="ticket-detail__items-row ticket-detail__items-row--sub">
                <span>Tổng tạm tính</span>
                <span />
                <span>{formatVnd(order.seat_subtotal)}</span>
              </div>
              {(order.booking_fee ?? 0) > 0 ? (
                <div className="ticket-detail__items-row ticket-detail__items-row--sub">
                  <span>Phí đặt vé</span>
                  <span />
                  <span>{formatVnd(order.booking_fee)}</span>
                </div>
              ) : null}
              {(order.delivery_fee ?? 0) > 0 ? (
                <div className="ticket-detail__items-row ticket-detail__items-row--sub">
                  <span>Phí giao vé ({deliveryMethodLabel(order.delivery_method)})</span>
                  <span />
                  <span>{formatVnd(order.delivery_fee)}</span>
                </div>
              ) : null}
              {(order.insurance_fee ?? 0) > 0 ? (
                <div className="ticket-detail__items-row ticket-detail__items-row--sub">
                  <span>Bảo hiểm</span>
                  <span />
                  <span>{formatVnd(order.insurance_fee)}</span>
                </div>
              ) : null}
              {(order.discount_amount ?? 0) > 0 ? (
                <div className="ticket-detail__items-row ticket-detail__items-row--sub">
                  <span>Giảm giá{order.voucher_code ? ` (${order.voucher_code})` : ''}</span>
                  <span />
                  <span>-{formatVnd(order.discount_amount)}</span>
                </div>
              ) : null}
              <div className="ticket-detail__items-row ticket-detail__items-row--total">
                <span>Tổng tiền</span>
                <span />
                <span>{formatVnd(order.total_price)}</span>
              </div>
            </div>
          </section>
        </article>
      )}
    </ProfileShell>
  );
}
