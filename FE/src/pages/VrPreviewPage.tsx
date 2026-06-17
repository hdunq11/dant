import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { LoadingOverlay, Spinner } from '../components/Spinner';
import { VrExperience } from '../components/vr/VrExperience';
import { SeatInfoPanel } from '../components/vr/SeatInfoPanel';
import { useVrFocusStore } from '../components/vr/vrFocusStore';
import { snapTurnLeft, snapTurnRight } from '../components/vr/vrViewStore';
import { xrStore } from '../components/vr/xrStore';
import { getApiErrorMessage } from '../context/AuthContext';
import type { CheckoutState, Concert, SeatMapZone, SelectedSeatDetail } from '../types';
import type { Seat3D } from '../utils/seatMap3D';
import { formatDateTime, formatVnd } from '../utils/format';
import { preloadVenueModel } from '../components/vr/VenueModel';
import { mapZonesTo3D, countGltfSeatsInZones, countSeatsInZones } from '../utils/seatMap3D';
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
    if (!id) return;
    const poll = setInterval(async () => {
      try {
        const mapRes = await concertApi.getSeatMap(id);
        setZones(mapRes.data.zones ?? []);
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [id]);

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
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        snapTurnLeft();
      }
      if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        snapTurnRight();
      }
      if (e.key === 'Escape') {
        useVrFocusStore.getState().exitSeatSelect?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hasVenueModel = !!concert?.venue?.model_glb_path;
  const seats3D = useMemo(
    () => mapZonesTo3D(zones, { onlyGltfCoords: hasVenueModel }),
    [zones, hasVenueModel]
  );
  const totalSeatCount = useMemo(() => countSeatsInZones(zones), [zones]);
  const gltfSeatCount = useMemo(() => countGltfSeatsInZones(zones), [zones]);
  const missingGltfCoords = hasVenueModel && gltfSeatCount < totalSeatCount;
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
      setError('Trình duyệt không hỗ trợ WebXR VR. Dùng Chrome + headset (Quest, v.v.).');
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
      if (!session) {
        setError('Không thể vào chế độ VR. Kiểm tra headset đã kết nối và bật.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes('secure')
          ? 'WebXR cần HTTPS. Trên Quest hãy dùng https:// hoặc truy cập qua Meta Link trên PC.'
          : `Không thể vào VR: ${msg}`
      );
      console.error('enterVR failed:', e);
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
        onSelectSeat={handleInspectSeat}
        onPreviewSeat={handleViewFromInfoSeat}
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
          <button
            type="button"
            className="btn btn-outline btn-sm vr-turn-btn"
            onClick={snapTurnLeft}
            title="Xoay trái 45° (Q)"
            aria-label="Xoay trái"
          >
            ↺
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm vr-turn-btn"
            onClick={snapTurnRight}
            title="Xoay phải 45° (E)"
            aria-label="Xoay phải"
          >
            ↻
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error vr-alert">{error}</div> : null}
      {missingGltfCoords ? (
        <div className="alert vr-alert vr-alert--warn">
          {gltfSeatCount}/{totalSeatCount} ghế có tọa độ 3D — chỉ hiện nhãn tại ghế đã import GLTF.
          Chạy <code>import_seats_from_gltf</code> để map đúng vị trí ghế trong model.
        </div>
      ) : null}
      {hasVenueModel && seats3D.length === 0 && !loading ? (
        <div className="alert vr-alert vr-alert--warn">
          Chưa có ghế nào được map vào model 3D. Admin cần import tọa độ từ file GLTF của venue.
        </div>
      ) : null}

      <div className="vr-rotate-pad" aria-label="Xoay góc nhìn">
        <button type="button" className="vr-rotate-pad__btn" onClick={snapTurnLeft} title="Xoay trái (Q)">
          ↺
        </button>
        <span className="vr-rotate-pad__label">Xoay</span>
        <button type="button" className="vr-rotate-pad__btn" onClick={snapTurnRight} title="Xoay phải (E)">
          ↻
        </button>
      </div>

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

      <div className="vr-hint">
        <span>Click ghế xem thông tin</span>
        <span>Desktop: kéo chuột · Q/E hoặc nút Xoay</span>
        {xrSupported ? (
          <span className="vr-hint__note">VR: A đóng thông tin ghế · B thoát VR · stick xoay/di chuyển</span>
        ) : (
          <span className="vr-hint__note">WebXR: Chrome + headset (Quest, v.v.)</span>
        )}
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
