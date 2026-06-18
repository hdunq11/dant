import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { LoadingOverlay, Spinner } from '../components/Spinner';
import { Stage1VrExperience } from '../components/vr/stage1/Stage1VrExperience';
import { SeatInfoPanel } from '../components/vr/SeatInfoPanel';
import { useVrFocusStore } from '../components/vr/vrFocusStore';
import { snapTurnLeft, snapTurnRight } from '../components/vr/vrViewStore';
import { xrStore } from '../components/vr/xrStore';
import { getApiErrorMessage } from '../context/AuthContext';
import type { CheckoutState, Concert, SeatMapZone, SelectedSeatDetail } from '../types';
import type { Seat3D } from '../utils/seatMap3D';
import { countSeatsInZones } from '../utils/seatMap3D';
import { countStage1GltfSeats, mapStage1ZonesTo3D } from '../utils/seatMap3DStage1';
import { isStage1Auditorium, isStage1VenueModel, STAGE1_TOTAL_SEATS } from '../utils/stage1SeatGrid';
import { formatDateTime, formatVnd } from '../utils/format';
import { preloadVenueModel } from '../components/vr/VenueModel';
import './VrPreviewPage.css';

interface VrLocationState {
  selected?: SelectedSeatDetail[];
}

/** Trang VR riêng cho model stage_1 — không dùng chung logic venue_stage_1. */
export function Stage1VrPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSelected = (location.state as VrLocationState | null)?.selected ?? [];

  const [concert, setConcert] = useState<Concert | null>(null);
  const [zones, setZones] = useState<SeatMapZone[]>([]);
  const [selected, setSelected] = useState<SelectedSeatDetail[]>(initialSelected);
  const [previewSeatId, setPreviewSeatId] = useState<string | null>(null);
  const [infoSeat, setInfoSeat] = useState<Seat3D | null>(null);
  const [viewFromSeat, setViewFromSeat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xrSupported, setXrSupported] = useState(false);
  const [xrEntering, setXrEntering] = useState(false);
  const [inVr, setInVr] = useState(false);
  const setFocusSeat = useVrFocusStore((s) => s.setFocusSeat);
  const clearFocus = useVrFocusStore((s) => s.clearFocus);
  const setExitSeatSelect = useVrFocusStore((s) => s.setExitSeatSelect);
  const setExitVr = useVrFocusStore((s) => s.setExitVr);

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

  useEffect(() => {
    setInVr(!!xrStore.getState().session);
    return xrStore.subscribe((state) => {
      const active = !!state.session;
      setInVr(active);
      if (!active) clearFocus();
    });
  }, [clearFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') snapTurnLeft();
      if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') snapTurnRight();
      if (e.key === 'Escape') useVrFocusStore.getState().exitSeatSelect?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const modelPath = concert?.venue?.model_glb_path;
  const isStage1 = isStage1VenueModel(modelPath);
  const seats3D = useMemo(() => mapStage1ZonesTo3D(zones), [zones]);
  const totalSeatCount = useMemo(() => countSeatsInZones(zones), [zones]);
  const gltfSeatCount = useMemo(() => countStage1GltfSeats(zones), [zones]);
  const isFullGrid = isStage1Auditorium(zones);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.seatId)), [selected]);
  const subtotal = selected.reduce((s, x) => s + x.price, 0);

  const toggleSeat = (
    seatId: string,
    zoneId: string,
    zoneName: string,
    row: string,
    number: number,
    price: number,
    selectable = true
  ) => {
    if (!selectable) return;
    if (selected.find((s) => s.seatId === seatId)) {
      setSelected((prev) => prev.filter((s) => s.seatId !== seatId));
      if (previewSeatId === seatId) {
        setPreviewSeatId(null);
        setInfoSeat(null);
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

  const closeInfoPanel = useCallback(() => {
    setInfoSeat(null);
    setPreviewSeatId(null);
    setViewFromSeat(false);
    clearFocus();
  }, [clearFocus]);

  const exitSeatSelect = useCallback(() => {
    closeInfoPanel();
  }, [closeInfoPanel]);

  useEffect(() => {
    setExitSeatSelect(exitSeatSelect);
    return () => setExitSeatSelect(null);
  }, [exitSeatSelect, setExitSeatSelect]);

  const exitVr = useCallback(async () => {
    const session = xrStore.getState().session;
    if (!session) return;
    clearFocus();
    setInfoSeat(null);
    setPreviewSeatId(null);
    setViewFromSeat(false);
    try {
      await session.end();
    } catch (e) {
      console.error('exit VR failed:', e);
    }
  }, [clearFocus]);

  useEffect(() => {
    setExitVr(exitVr);
    return () => setExitVr(null);
  }, [exitVr, setExitVr]);

  const handleInspectSeat = (seat: Seat3D) => {
    setInfoSeat(seat);
    setPreviewSeatId(seat.seatId);
    if (inVr) setFocusSeat(seat);
  };

  const handleToggleInfoSeat = () => {
    if (!infoSeat) return;
    toggleSeat(
      infoSeat.seatId,
      infoSeat.zoneId,
      infoSeat.zoneName,
      infoSeat.row,
      infoSeat.number,
      infoSeat.price,
      infoSeat.selectable !== false
    );
  };

  const handleViewFromInfoSeat = () => {
    if (!infoSeat) return;
    setViewFromSeat(true);
    if (inVr) setFocusSeat(infoSeat);
  };

  const enterVr = async () => {
    if (!xrSupported) {
      setError('Trình duyệt không hỗ trợ WebXR VR.');
      return;
    }
    setXrEntering(true);
    setError(null);
    setViewFromSeat(false);
    setPreviewSeatId(null);
    setInfoSeat(null);
    clearFocus();
    try {
      const session = await xrStore.enterVR();
      if (!session) setError('Không thể vào chế độ VR.');
    } catch (e) {
      setError(getApiErrorMessage(e));
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
        <Stage1VrExperience
          seats={seats3D}
          selectedIds={selectedIds}
          previewSeatId={previewSeatId}
          viewFromSeat={viewFromSeat}
          modelPath={modelPath ? `/${modelPath}` : null}
          onSelectSeat={handleInspectSeat}
        />
      </div>

      <header className="vr-topbar">
        <Link to={`/concerts/${id}`} className="vr-topbar__back">
          ← Quay lại
        </Link>
        <div className="vr-topbar__info">
          <h1>{concert?.title ?? 'VR stage_1'}</h1>
          {metaLine ? <p>{metaLine}</p> : null}
        </div>
        <div className="vr-topbar__actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={enterVr}
            disabled={xrEntering || !xrSupported}
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

      {!isStage1 ? (
        <div className="alert vr-alert vr-alert--warn">
          Concert này chưa gắn model <code>stage_1</code>. Cần venue.model_glb_path = models/stage_1/scene.gltf
        </div>
      ) : null}

      {isStage1 && !isFullGrid ? (
        <div className="alert vr-alert vr-alert--warn">
          Lưới ghế chưa đủ {STAGE1_TOTAL_SEATS} — chạy <code>setup_stage1_grid --concert-id {id}</code>
        </div>
      ) : null}

      {isStage1 && gltfSeatCount < totalSeatCount ? (
        <div className="alert vr-alert vr-alert--warn">
          {gltfSeatCount}/{totalSeatCount} ghế có tọa độ 3D — chạy <code>import_seats_from_stage1</code>
        </div>
      ) : null}

      {isStage1 && gltfSeatCount === STAGE1_TOTAL_SEATS ? (
        <div className="alert vr-alert" style={{ background: 'rgba(22,163,74,0.15)', borderColor: '#16a34a' }}>
          ✓ {gltfSeatCount} ghế đã map vào model stage_1
        </div>
      ) : null}

      {infoSeat && concert ? (
        <SeatInfoPanel
          seat={infoSeat}
          concert={concert}
          selected={selectedIds.has(infoSeat.seatId)}
          onClose={closeInfoPanel}
          onToggleSelect={handleToggleInfoSeat}
          onViewFromSeat={handleViewFromInfoSeat}
        />
      ) : null}

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
      </aside>

      <LoadingOverlay visible={reserving} message="Đang giữ ghế..." />
    </div>
  );
}
