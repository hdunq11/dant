import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { LoadingOverlay, Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { CheckoutState, SeatMapZone, SelectedSeatDetail } from '../types';
import { formatVnd } from '../utils/format';
import './SeatSelectionPage.css';

export function SeatSelectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [zones, setZones] = useState<SeatMapZone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedSeatDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await concertApi.getSeatMap(id);
      const z = res.data.zones ?? [];
      setZones(z);
      if (z.length) setActiveZoneId(z[0].zone_id ?? null);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const activeZone = zones.find((z) => z.zone_id === activeZoneId) ?? zones[0];
  const subtotal = selected.reduce((s, x) => s + x.price, 0);

  const toggleSeat = (zone: SeatMapZone, seatId: string, row: string, number: number) => {
    const seat = zone.seats?.find((s) => s.seat_id === seatId);
    if (!seat || seat.status === 'sold' || seat.status === 'reserved') return;
    if (selected.find((s) => s.seatId === seatId)) {
      setSelected((prev) => prev.filter((s) => s.seatId !== seatId));
      return;
    }
    if (selected.length >= 6) {
      setError('Tối đa 6 ghế mỗi lần đặt.');
      return;
    }
    setSelected((prev) => [
      ...prev,
      {
        seatId,
        zoneId: zone.zone_id!,
        zoneName: zone.name ?? '',
        row,
        number,
        price: zone.price ?? 0,
      },
    ]);
    setError(null);
  };

  const seatClass = (status?: string, picked?: boolean) => {
    if (picked) return 'seat seat--selected';
    if (status === 'sold') return 'seat seat--sold';
    if (status === 'reserved') return 'seat seat--reserved';
    return 'seat seat--available';
  };

  const mapContent = useMemo(() => {
    if (!activeZone?.seats?.length) return null;
    const seats = activeZone.seats;
    const maxX = Math.max(...seats.map((s) => s.pos_x ?? 0), 100);
    const maxY = Math.max(...seats.map((s) => s.pos_y ?? 0), 100);
    const scale = 420 / Math.max(maxX, maxY, 1);
    return (
      <div className="seat-map" style={{ width: maxX * scale + 40, height: maxY * scale + 40 }}>
        {seats.map((seat) => {
          const sid = seat.seat_id!;
          const picked = selected.some((s) => s.seatId === sid);
          return (
            <button
              key={sid}
              type="button"
              title={`Hàng ${seat.row} · Ghế ${seat.number}`}
              className={seatClass(seat.status, picked)}
              style={{ left: (seat.pos_x ?? 0) * scale, top: (seat.pos_y ?? 0) * scale }}
              onClick={() => toggleSeat(activeZone, sid, seat.row ?? '', seat.number ?? 0)}
              disabled={seat.status === 'sold' || seat.status === 'reserved'}
            />
          );
        })}
      </div>
    );
  }, [activeZone, selected]);

  const continueCheckout = async () => {
    if (!id || selected.length === 0) return;
    setReserving(true);
    try {
      const res = await concertApi.reserveSeats(
        id,
        selected.map((s) => s.seatId)
      );
      const state: CheckoutState = {
        concertId: id,
        seatIds: selected.map((s) => s.seatId),
        seatSubtotal: subtotal,
        reservedUntil: res.data.reserved_until ?? '',
        seatDetails: selected,
      };
      sessionStorage.setItem('checkout', JSON.stringify(state));
      navigate(`/concerts/${id}/checkout`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setReserving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="page seat-page">
      <div className="container seat-layout">
        <div className="seat-main">
          <h1 className="page-title">Chọn ghế</h1>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="zone-tabs">
            {zones.map((z) => (
              <button
                key={z.zone_id}
                type="button"
                className={`zone-tab ${z.zone_id === activeZoneId ? 'active' : ''}`}
                onClick={() => setActiveZoneId(z.zone_id ?? null)}
              >
                <strong>{z.name}</strong>
                <span>{formatVnd(z.price)}</span>
              </button>
            ))}
          </div>
          <div className="stage-label">SÂN KHẤU</div>
          <div className="map-wrap">{mapContent}</div>
          <div className="legend">
            <span><i className="dot available" /> Trống</span>
            <span><i className="dot selected" /> Đã chọn</span>
            <span><i className="dot reserved" /> Giữ chỗ</span>
            <span><i className="dot sold" /> Đã bán</span>
          </div>
        </div>
        <aside className="seat-sidebar card">
          <h3>Tóm tắt</h3>
          <p className="summary-total">
            {selected.length} ghế · <strong>{formatVnd(subtotal)}</strong>
          </p>
          <ul className="seat-list">
            {selected.map((s) => (
              <li key={s.seatId}>
                {s.zoneName} · Hàng {s.row} · Ghế {s.number}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!selected.length}
            onClick={continueCheckout}
          >
            Tiếp tục thanh toán
          </button>
          <Link to={`/concerts/${id}`} className="back-link">
            ← Quay lại
          </Link>
        </aside>
      </div>
      <LoadingOverlay visible={reserving} message="Đang giữ ghế..." />
    </div>
  );
}
