import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { LoadingOverlay, Spinner } from '../components/Spinner';
import { VrExperience, xrStore } from '../components/vr/VrExperience';
import { getApiErrorMessage } from '../context/AuthContext';
import type { CheckoutState, Concert, SeatMapZone, SelectedSeatDetail } from '../types';
import { formatDateTime, formatVnd } from '../utils/format';
import { preloadVenueModel } from '../components/vr/VenueModel';
import { mapZonesTo3D } from '../utils/seatMap3D';
import './VrPreviewPage.css';

interface VrLocationState {
  selected?: SelectedSeatDetail[];
}

export function VrPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSelected = (location.state as VrLocationState | null)?.selected ?? [];

  const [concert, setConcert] = useState<Concert | null>(null);
  const [zones, setZones] = useState<SeatMapZone[]>([]);
  const [selected, setSelected] = useState<SelectedSeatDetail[]>(initialSelected);
  const [previewSeatId, setPreviewSeatId] = useState<string | null>(null);
  const [viewFromSeat, setViewFromSeat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xrSupported, setXrSupported] = useState(false);
  const [xrEntering, setXrEntering] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, mapRes] = await Promise.all([
        concertApi.getConcertDetail(id),
        concertApi.getSeatMap(id),
      ]);
      setConcert(detailRes.data);
      setZones(mapRes.data.zones ?? []);
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
    const path = concert?.venue?.model_glb_path;
    if (path) preloadVenueModel(`/${path}`);
  }, [concert?.venue?.model_glb_path]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then(setXrSupported).catch(() => setXrSupported(false));
    }
  }, []);

  const seats3D = useMemo(() => mapZonesTo3D(zones), [zones]);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.seatId)), [selected]);
  const subtotal = selected.reduce((s, x) => s + x.price, 0);

  const toggleSeat = (seatId: string, zoneId: string, zoneName: string, row: string, number: number, price: number, status?: string) => {
    if (status === 'sold' || status === 'reserved') return;
    if (selected.find((s) => s.seatId === seatId)) {
      setSelected((prev) => prev.filter((s) => s.seatId !== seatId));
      if (previewSeatId === seatId) {
        setPreviewSeatId(null);
        setViewFromSeat(false);
      }
      return;
    }
    if (selected.length >= 6) {
      setError('Tối đa 6 ghế mỗi lần đặt.');
      return;
    }
    setSelected((prev) => [...prev, { seatId, zoneId, zoneName, row, number, price }]);
    setError(null);
  };

  const handleSelectSeat = (seat: (typeof seats3D)[number]) => {
    toggleSeat(seat.seatId, seat.zoneId, seat.zoneName, seat.row, seat.number, seat.price, seat.status);
  };

  const handlePreviewSeat = (seat: (typeof seats3D)[number]) => {
    if (seat.status === 'sold' || seat.status === 'reserved') return;
    setPreviewSeatId(seat.seatId);
    setViewFromSeat(true);
  };

  const enterVr = async () => {
    setXrEntering(true);
    setError(null);
    try {
      await xrStore.enterVR();
    } catch (e) {
      setError('Không thể vào chế độ VR. Thử trình duyệt hỗ trợ WebXR hoặc dùng emulator trên localhost.');
      console.error(e);
    } finally {
      setXrEntering(false);
    }
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
    ? [formatDateTime(concert.start_time), concert.venue?.name, concert.venue?.city].filter(Boolean).join(' · ')
    : '';

  if (loading) return <Spinner />;

  return (
    <div className="vr-page">
      <div className="vr-canvas-wrap">
      <VrExperience
        seats={seats3D}
        selectedIds={selectedIds}
        previewSeatId={previewSeatId}
        viewFromSeat={viewFromSeat}
        modelPath={concert?.venue?.model_glb_path ? `/${concert.venue.model_glb_path}` : null}
        onSelectSeat={handleSelectSeat}
        onPreviewSeat={handlePreviewSeat}
      />
      </div>

      <header className="vr-topbar">
        <Link to={`/concerts/${id}`} className="vr-topbar__back">
          ← Quay lại
        </Link>
        <div className="vr-topbar__info">
          <h1>{concert?.title ?? 'Xem trước VR'}</h1>
          {metaLine ? <p>{metaLine}</p> : null}
        </div>
        <div className="vr-topbar__actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={enterVr}
            disabled={xrEntering}
          >
            {xrEntering ? 'Đang vào VR...' : 'Vào VR'}
          </button>
          <button
            type="button"
            className={`btn btn-outline btn-sm ${viewFromSeat ? 'active' : ''}`}
            onClick={() => setViewFromSeat((v) => !v)}
            disabled={!previewSeatId}
          >
            {viewFromSeat ? 'Thoát góc nhìn' : 'Góc nhìn ghế'}
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error vr-alert">{error}</div> : null}

      <div className="vr-hint">
        <span>Click chọn ghế</span>
        <span>Double-click xem từ ghế</span>
        {!xrSupported ? <span className="vr-hint__note">WebXR: Chrome + headset</span> : null}
      </div>

      <aside className="vr-sidebar">
        <h3>Đã chọn ({selected.length})</h3>
        <p className="vr-sidebar__total">
          <strong>{formatVnd(subtotal)}</strong>
        </p>
        <ul className="vr-seat-list">
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
        <Link to={`/concerts/${id}/seats`} state={{ selected }} className="back-link">
          ← Sơ đồ 2D
        </Link>
      </aside>

      <LoadingOverlay visible={reserving} message="Đang giữ ghế..." />
    </div>
  );
}
