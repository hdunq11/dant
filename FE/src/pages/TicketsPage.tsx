import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { EmptyState } from '../components/EmptyState';
import { ProfileShell } from '../components/ProfileShell';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { Order } from '../types';
import { extractList } from '../utils/apiData';
import {
  formatConcertTimeRange,
  formatTicketDay,
  formatTicketMonthYear,
  formatVnd,
  isConcertEnded,
} from '../utils/format';
import './TicketsPage.css';

type TicketTab = 'upcoming' | 'past';

function TicketCard({ order }: { order: Order }) {
  const when = order.concert_start_time;
  const venueLine = [order.concert_venue_name, order.concert_city].filter(Boolean).join(', ');

  return (
    <Link to={`/tickets/${order.id}`} className="ticket-card">
      <div className="ticket-card__date">
        <strong>{formatTicketDay(when)}</strong>
        <span>{formatTicketMonthYear(when)}</span>
      </div>

      <div className="ticket-card__info">
        <h3>{order.concert_title ?? 'Concert'}</h3>
        <div className="ticket-card__tags">
          <span className="ticket-tag ticket-tag--ok">Thành công</span>
          <span className="ticket-tag">Vé điện tử</span>
        </div>
        <p className="ticket-card__line">
          Mã đơn · #{order.id?.slice(0, 8).toUpperCase()}
        </p>
        <p className="ticket-card__line">{formatConcertTimeRange(when, order.concert_end_time)}</p>
        {venueLine ? <p className="ticket-card__line ticket-card__line--muted">{venueLine}</p> : null}
        <p className="ticket-card__price">{formatVnd(order.total_price)}</p>
      </div>

      <div className="ticket-card__chevron" aria-hidden="true">›</div>
    </Link>
  );
}

export function TicketsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TicketTab>('upcoming');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await concertApi.getMyOrders();
      setOrders(extractList<Order>(res.data).filter((o) => o.status === 'paid'));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const upcomingOrders: Order[] = [];
    const pastOrders: Order[] = [];
    for (const o of orders) {
      if (isConcertEnded(o.concert_start_time, o.concert_end_time)) {
        pastOrders.push(o);
      } else {
        upcomingOrders.push(o);
      }
    }
    upcomingOrders.sort(
      (a, b) =>
        new Date(a.concert_start_time ?? 0).getTime() - new Date(b.concert_start_time ?? 0).getTime()
    );
    pastOrders.sort(
      (a, b) =>
        new Date(b.concert_start_time ?? 0).getTime() - new Date(a.concert_start_time ?? 0).getTime()
    );
    return { upcoming: upcomingOrders, past: pastOrders };
  }, [orders]);

  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <ProfileShell title="Vé của tôi" subtitle="Vé điện tử đã thanh toán.">
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="ticket-tabs" role="tablist" aria-label="Lọc vé theo thời gian">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upcoming'}
          className={`ticket-tabs__btn ${tab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setTab('upcoming')}
        >
          Sắp diễn ra
          {upcoming.length ? <span className="ticket-tabs__count">{upcoming.length}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'past'}
          className={`ticket-tabs__btn ${tab === 'past' ? 'active' : ''}`}
          onClick={() => setTab('past')}
        >
          Đã kết thúc
          {past.length ? <span className="ticket-tabs__count">{past.length}</span> : null}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length ? (
        <div className="ticket-list">
          {visible.map((o) => (
            <TicketCard key={o.id} order={o} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="ticket"
          title={tab === 'upcoming' ? 'Chưa có vé sắp diễn ra' : 'Chưa có vé đã kết thúc'}
          description={
            tab === 'upcoming'
              ? 'Đặt vé concert yêu thích — vé sắp diễn ra sẽ hiện tại đây.'
              : 'Các show đã qua sẽ được lưu trong mục này.'
          }
          action={tab === 'upcoming' ? { label: 'Khám phá concert', to: '/' } : undefined}
        />
      )}
    </ProfileShell>
  );
}
