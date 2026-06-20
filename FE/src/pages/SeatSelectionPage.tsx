import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { SeatIcon } from '../components/SeatIcon';
import { LoadingOverlay, Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { CheckoutState, Concert, SeatMapZone, SelectedSeatDetail } from '../types';
import { formatDateTime, formatVnd } from '../utils/format';
import { layoutSeatMapZones } from '../utils/seatMapLayout';
import { layoutStage1SeatMapZones } from '../utils/seatMapLayoutStage1';
import { isStage1Auditorium, isStage1VenueModel } from '../utils/stage1SeatGrid';
import { getSeatDisplayColor, resolveZoneColor, SEAT_STATUS_COLORS } from '../utils/zoneColors';
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
  const holdExpiredMsg = locationState?.holdExpired
    ? 'Thời gian giữ ghế đã hết. Vui lòng chọn lại.'
    : null;
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
      setActiveZoneId(null);
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

  const { zoneLayouts, canvasW, canvasH, stageWidth } = useMemo(() => {
    if (isStage1VenueModel(concert?.venue?.model_glb_path) && isStage1Auditorium(zones)) {
      return layoutStage1SeatMapZones(zones);
    }
    const base = layoutSeatMapZones(zones);
    return { ...base, stageWidth: undefined as number | undefined };
  }, [zones, concert?.venue?.model_glb_path]);

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
              {zones.map((z, index) => (
                <button
                  key={z.zone_id}
                  type="button"
                  className={`price-pill ${z.zone_id === activeZoneId ? 'active' : ''}`}
                  onClick={() =>
                    setActiveZoneId((prev) => (prev === z.zone_id ? null : (z.zone_id ?? null)))
                  }
                >
                  <span
                    className="price-pill__swatch"
                    style={{ background: resolveZoneColor(z.color, index) }}
                    aria-hidden
                  />
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
                <div
                  className="arena-stage"
                  style={stageWidth ? { width: stageWidth, maxWidth: 'none' } : undefined}
                >
                  Sân khấu
                </div>

                {zoneLayouts.map((layout) => (
                    <div
                      key={layout.zoneId}
                      className="zone-block zone-block--active"
                      style={{
                        left: layout.x,
                        top: layout.y,
                        width: layout.width,
                        height: layout.height,
                        transform: `rotate(${layout.rotate}deg)`,
                      }}
                    >
                      {!layout.auditorium ? (
                        <span className="zone-block__label">{layout.zoneName}</span>
                      ) : null}
                      <div className="zone-block__seats">
                        {layout.seats.map((seat) => {
                          const picked = selected.some((s) => s.seatId === seat.seatId);
                          const label =
                            seat.globalNumber != null
                              ? `#${seat.globalNumber}`
                              : `${seat.row}${seat.number}`;
                          return (
                            <button
                              key={seat.seatId}
                              type="button"
                              title={`${seat.zoneName} · ${label}`}
                              className={seatClass(seat.status, picked, seat.reservedByMe)}
                              style={{
                                left: seat.x - layout.x,
                                top: seat.y - layout.y,
                                color: getSeatDisplayColor(
                                  seat.status,
                                  picked,
                                  seat.reservedByMe,
                                  seat.zoneColor
                                ),
                              }}
                              onClick={() =>
                                toggleSeat(
                                  {
                                    zone_id: seat.zoneId,
                                    name: seat.zoneName,
                                    price: seat.price,
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
                  ))}
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
            {zones.map((z, index) => (
              <span key={z.zone_id}>
                <i
                  className="dot zone"
                  style={{ background: resolveZoneColor(z.color, index) }}
                />
                {z.name}
              </span>
            ))}
            <span>
              <i className="dot selected" style={{ background: SEAT_STATUS_COLORS.selected }} />
              Đã chọn
            </span>
            <span>
              <i className="dot reserved" style={{ background: SEAT_STATUS_COLORS.reserved }} />
              Đang giữ
            </span>
            <span>
              <i className="dot sold" style={{ background: SEAT_STATUS_COLORS.sold }} />
              Đã bán
            </span>
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
            to={
              isStage1VenueModel(concert?.venue?.model_glb_path)
                ? `/concerts/${id}/vr-stage1`
                : `/concerts/${id}/vr-preview`
            }
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
