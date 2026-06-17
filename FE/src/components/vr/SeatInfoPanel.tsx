import type { Concert } from '../../types';
import type { Seat3D } from '../../utils/seatMap3D';
import { seatLabel } from '../../utils/seatMap3D';
import { formatDateTime, formatVnd } from '../../utils/format';
import './SeatInfoPanel.css';

interface SeatInfoPanelProps {
  seat: Seat3D;
  concert: Concert;
  selected: boolean;
  onClose: () => void;
  onToggleSelect: () => void;
  onViewFromSeat: () => void;
}

function seatStatusLabel(seat: Seat3D): string {
  if (seat.status === 'sold') return 'Đã bán';
  if (seat.status === 'reserved') {
    return seat.reservedByMe ? 'Bạn đang giữ ghế này' : 'Đã được giữ';
  }
  return 'Còn trống';
}

function seatStatusClass(seat: Seat3D): string {
  if (seat.status === 'sold') return 'vr-seat-info__status--sold';
  if (seat.status === 'reserved') {
    return seat.reservedByMe ? 'vr-seat-info__status--mine' : 'vr-seat-info__status--reserved';
  }
  return 'vr-seat-info__status--available';
}

export function SeatInfoPanel({
  seat,
  concert,
  selected,
  onClose,
  onToggleSelect,
  onViewFromSeat,
}: SeatInfoPanelProps) {
  const artists =
    concert.concert_artists
      ?.map((ca) => ca.artist?.name)
      .filter((name): name is string => !!name) ?? [];
  const label = seatLabel(seat);
  const canSelect = seat.selectable !== false && seat.status !== 'sold';

  return (
    <aside className="vr-seat-info" role="dialog" aria-labelledby="vr-seat-info-title">
      <div className="vr-seat-info__header">
        <div className="vr-seat-info__title-wrap">
          <span className="vr-seat-info__zone-dot" style={{ background: seat.color }} aria-hidden />
          <div>
            <h2 id="vr-seat-info-title" className="vr-seat-info__title">
              Ghế {label}
            </h2>
            <p className="vr-seat-info__zone">{seat.zoneName}</p>
          </div>
        </div>
        <button
          type="button"
          className="vr-seat-info__close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
      </div>

      <dl className="vr-seat-info__list">
        <div className="vr-seat-info__row">
          <dt>Concert</dt>
          <dd>{concert.title ?? '—'}</dd>
        </div>
        {artists.length > 0 ? (
          <div className="vr-seat-info__row">
            <dt>Nghệ sĩ</dt>
            <dd>{artists.join(', ')}</dd>
          </div>
        ) : null}
        <div className="vr-seat-info__row">
          <dt>Thời gian</dt>
          <dd>{formatDateTime(concert.start_time)}</dd>
        </div>
        {concert.end_time ? (
          <div className="vr-seat-info__row">
            <dt>Kết thúc</dt>
            <dd>{formatDateTime(concert.end_time)}</dd>
          </div>
        ) : null}
        <div className="vr-seat-info__row">
          <dt>Địa điểm</dt>
          <dd>
            {[concert.venue?.name, concert.venue?.city].filter(Boolean).join(' · ') || '—'}
          </dd>
        </div>
        {concert.venue?.address ? (
          <div className="vr-seat-info__row">
            <dt>Địa chỉ</dt>
            <dd>{concert.venue.address}</dd>
          </div>
        ) : null}
        <div className="vr-seat-info__row">
          <dt>Hàng · Số ghế</dt>
          <dd>
            {seat.row} · {seat.number}
          </dd>
        </div>
        <div className="vr-seat-info__row">
          <dt>Khu vực</dt>
          <dd>{seat.zoneName}</dd>
        </div>
        <div className="vr-seat-info__row">
          <dt>Giá vé</dt>
          <dd className="vr-seat-info__price">{formatVnd(seat.price)}</dd>
        </div>
        <div className="vr-seat-info__row">
          <dt>Trạng thái</dt>
          <dd>
            <span className={`vr-seat-info__status ${seatStatusClass(seat)}`}>
              {seatStatusLabel(seat)}
            </span>
          </dd>
        </div>
        {concert.event_source ? (
          <div className="vr-seat-info__row">
            <dt>Nguồn sự kiện</dt>
            <dd>{concert.event_source}</dd>
          </div>
        ) : null}
      </dl>

      <div className="vr-seat-info__actions">
        {canSelect ? (
          <button
            type="button"
            className={`btn btn-block ${selected ? 'btn-outline' : 'btn-primary'}`}
            onClick={onToggleSelect}
          >
            {selected ? 'Bỏ chọn ghế' : 'Chọn ghế này'}
          </button>
        ) : null}
        {seat.selectable !== false ? (
          <button type="button" className="btn btn-outline btn-block" onClick={onViewFromSeat}>
            Góc nhìn từ ghế
          </button>
        ) : null}
      </div>
    </aside>
  );
}
