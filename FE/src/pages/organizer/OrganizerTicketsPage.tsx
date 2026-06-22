import { useCallback, useEffect, useState } from 'react';
import { organizerApi, type OrganizerTicketSummary } from '../../api/organizerApi';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { PageHeader } from '../../components/portal/PageHeader';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Concert } from '../../types';
import { formatVnd } from '../../utils/format';
import { CONCERT_STATUS_LABEL, concertStatusClass } from './organizerUtils';

const SEAT_COLOR: Record<string, string> = {
  available: '#94a3b8',
  reserved: '#fbbf24',
  sold: '#22c55e',
};

export function OrganizerTicketsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [concertId, setConcertId] = useState('');
  const [items, setItems] = useState<OrganizerTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConcerts = useCallback(async () => {
    const res = await organizerApi.getConcerts();
    const data = res.data as Concert[] | { results?: Concert[] };
    const list = Array.isArray(data) ? data : data.results ?? [];
    setConcerts(list);
    if (!concertId && list[0]?.id) setConcertId(list[0].id);
  }, [concertId]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApi.getTickets(concertId || undefined);
      setItems(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [concertId]);

  useEffect(() => { loadConcerts().catch((e) => setError(getApiErrorMessage(e))); }, [loadConcerts]);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  return (
    <div>
      <PageHeader title="Tickets" subtitle="Tình trạng vé theo concert và từng khu giá." />
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-toolbar">
        <label>
          Concert{' '}
          <select value={concertId} onChange={(e) => setConcertId(e.target.value)}>
            <option value="">Tất cả</option>
            {concerts.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="admin-card">
          <LoadingState variant="inline" compact label="Đang tải dữ liệu vé..." />
        </div>
      ) : items.length ? (
        <div className="organizer-ticket-grid">
          {items.map((item) => (
        <div key={item.concert_id} className="organizer-zone-card">
          <div className="organizer-zone-card__head">
            <h3>{item.title}</h3>
            <span className={concertStatusClass(item.status)}>{CONCERT_STATUS_LABEL[item.status] ?? item.status}</span>
          </div>
          <p className="organizer-zone-card__stats">
            Tổng {item.total} · Còn {item.available} · Giữ {item.reserved} · Đã bán {item.sold}
          </p>
          {item.zones.map((z) => (
            <div key={z.zone_id} className="organizer-zone-row">
              <strong style={{ color: z.color }}>{z.name}</strong> — {formatVnd(z.price)}
              <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>
                ({z.sold} bán / {z.total} ghế)
              </span>
            </div>
          ))}
          <div className="organizer-seatmap-preview" aria-hidden>
            <span className="organizer-seat-dot" style={{ background: SEAT_COLOR.available }} title="Còn" />
            <span style={{ fontSize: 12 }}>Còn</span>
            <span className="organizer-seat-dot" style={{ background: SEAT_COLOR.reserved }} />
            <span style={{ fontSize: 12 }}>Giữ</span>
            <span className="organizer-seat-dot" style={{ background: SEAT_COLOR.sold }} />
            <span style={{ fontSize: 12 }}>Đã bán</span>
          </div>
        </div>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon="ticket"
          title="Chưa có dữ liệu vé"
          description="Tạo concert để theo dõi tình trạng vé tại đây."
          action={{ label: 'Create Concert', to: '/organizer/concerts/create' }}
        />
      )}
    </div>
  );
}
