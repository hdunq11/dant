import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { SeatIcon } from '../components/SeatIcon';
import { LoadingOverlay, Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { CheckoutState, Concert, SeatMapZone, SelectedSeatDetail } from '../types';
import { formatDateTime, formatVnd } from '../utils/format';
import { layoutSeatMapZones } from '../utils/seatMapLayout';
import './SeatSelectionPage.css';

interface SeatLocationState {
  selected?: SelectedSeatDetail[];
  holdExpired?: boolean;
}

export function SeatSelectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as SeatLocationState | null;
  const restoredSelected = locationState?.selected;
  const [holdExpiredMsg, setHoldExpiredMsg] = useState<string | null>(
    locationState?.holdExpired ? 'Thời gian giữ ghế đã hết. Vui lòng chọn lại.' : null
  );
  const [concert, setConcert] = useState<Concert | null>(null);
  const [zones, setZones] = useState<SeatMapZone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedSeatDetail[]>(restoredSelected ?? []);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, mapRes] = await Promise.all([
        concertApi.getConcertDetail(id),
        concertApi.getSeatMap(id),
      ]);
      setConcert(detailRes.data);
      const z = mapRes.data.zones ?? [];
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

  useEffect(() => {
    if (!id) return;
    const poll = setInterval(async () => {
      try {
        const mapRes = await concertApi.getSeatMap(id);
        setZones(mapRes.data.zones ?? []);
      } catch {
        /* ignore polling errors */
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [id]);

  const { zoneLayouts, canvasW, canvasH } = useMemo(
    () => layoutSeatMapZones(zones),
    [zones]
  );

  const subtotal = selected.reduce((s, x) => s + x.price, 0);

  const toggleSeat = (
    zone: Pick<SeatMapZone, 'zone_id' | 'name' | 'price'>,
    seatId: string,
    row: string,
    number: number,
    status?: string,
    selectable = true
  ) => {
    if (!selectable || status === 'sold') return;
    if (status === 'reserved' && !selectable) return;
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

  const seatClass = (status?: string, picked?: boolean, reservedByMe?: boolean) => {
    if (picked) return 'arena-seat arena-seat--selected';
    if (status === 'sold') return 'arena-seat arena-seat--sold';
    if (status === 'reserved' && !reservedByMe) return 'arena-seat arena-seat--reserved';
    return 'arena-seat arena-seat--available';
  };

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

  const metaLine = concert
    ? [
        formatDateTime(concert.start_time),
        concert.venue?.name,
        concert.venue?.city,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  if (loading) return <Spinner />;

  return (
    <div className="page seat-page">
      <div className="container seat-layout">
        <div className="seat-main">
          <header className="seat-header">
            <h1 className="seat-header__title">{concert?.title ?? 'Chọn ghế'}</h1>
            {metaLine ? <p className="seat-header__meta">{metaLine}</p> : null}
          </header>

          {holdExpiredMsg ? <div className="alert alert-error">{holdExpiredMsg}</div> : null}
          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="price-row">
            <span className="price-row__label">Giá vé:</span>
            <div className="price-pills">
              {zones.map((z) => (
                <button
                  key={z.zone_id}
                  type="button"
                  className={`price-pill ${z.zone_id === activeZoneId ? 'active' : ''}`}
                  onClick={() => setActiveZoneId(z.zone_id ?? null)}
                >
                  <strong>{formatVnd(z.price)}</strong>
                  <span>{z.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="arena">
            <div className="arena-viewport">
              <div
                className="arena-canvas"
                style={{
                  width: canvasW,
                  height: canvasH,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <div className="arena-stage">Sân khấu</div>

                {zoneLayouts.map((layout) => {
                  const isActive = !activeZoneId || layout.zoneId === activeZoneId;
                  return (
                    <div
                      key={layout.zoneId}
                      className={`zone-block ${isActive ? 'zone-block--active' : 'zone-block--dim'}`}
                      style={{
                        left: layout.x,
                        top: layout.y,
                        width: layout.width,
                        height: layout.height,
                        transform: `rotate(${layout.rotate}deg)`,
                      }}
                    >
                      <span className="zone-block__label">{layout.zoneName}</span>
                      <div className="zone-block__seats">
                        {layout.seats.map((seat) => {
                          const picked = selected.some((s) => s.seatId === seat.seatId);
                          return (
                            <button
                              key={seat.seatId}
                              type="button"
                              title={`${layout.zoneName} · Hàng ${seat.row} · Ghế ${seat.number}`}
                              className={seatClass(seat.status, picked, seat.reservedByMe)}
                              style={{ left: seat.x - layout.x, top: seat.y - layout.y }}
                              onClick={() =>
                                toggleSeat(
                                  {
                                    zone_id: layout.zoneId,
                                    name: layout.zoneName,
                                    price: layout.price,
                                  },
                                  seat.seatId,
                                  seat.row,
                                  seat.number,
                                  seat.status,
                                  seat.selectable !== false
                                )
                              }
                              disabled={seat.selectable === false}
                            >
                              <SeatIcon />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="zoom-controls">
              <button type="button" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} aria-label="Phóng to">
                +
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))} aria-label="Thu nhỏ">
                −
              </button>
            </div>
          </div>

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
          <Link
            to={`/concerts/${id}/vr-preview`}
            state={{ selected }}
            className="btn btn-outline btn-block vr-link"
          >
            Xem trước 3D / VR
          </Link>
          <Link to={`/concerts/${id}`} className="back-link">
            ← Quay lại
          </Link>
        </aside>
      </div>
      <LoadingOverlay visible={reserving} message="Đang giữ ghế..." />
    </div>
  );
}
