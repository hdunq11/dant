import { useCallback, useEffect, useMemo, useState } from 'react';
import { VrExperience } from '../../vr/VrExperience';
import { Stage1VrExperience } from '../../vr/stage1/Stage1VrExperience';
import { useVrFocusStore } from '../../vr/vrFocusStore';
import { snapTurnLeft, snapTurnRight } from '../../vr/vrViewStore';
import { xrStore } from '../../vr/xrStore';
import { preloadVenueModel } from '../../vr/VenueModel';
import type { OrganizerStageOption } from '../../../constants/organizerStageCatalog';
import type { Seat3D } from '../../../utils/seatMap3D';
import { seatLabel } from '../../../utils/seatMap3D';
import './OrganizerStageModelViewer.css';

interface OrganizerStage3DViewerProps {
  option: OrganizerStageOption;
  seats3D: Seat3D[];
  previewSeatId: string | null;
  viewFromSeat: boolean;
  onSeatFocus: (seat: Seat3D) => void;
  onExitSeatView: () => void;
}

export function OrganizerStage3DViewer({
  option,
  seats3D,
  previewSeatId,
  viewFromSeat,
  onSeatFocus,
  onExitSeatView,
}: OrganizerStage3DViewerProps) {
  const [xrSupported, setXrSupported] = useState(false);
  const [xrEntering, setXrEntering] = useState(false);
  const [inVr, setInVr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFocusSeat = useVrFocusStore((s) => s.setFocusSeat);
  const clearFocus = useVrFocusStore((s) => s.clearFocus);
  const setExitSeatSelect = useVrFocusStore((s) => s.setExitSeatSelect);
  const setExitVr = useVrFocusStore((s) => s.setExitVr);

  const previewSeat = useMemo(
    () => seats3D.find((s) => s.seatId === previewSeatId) ?? null,
    [seats3D, previewSeatId]
  );

  const emptySelection = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    preloadVenueModel(option.modelPath);
  }, [option.modelPath]);

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

  const handleExitSeatView = useCallback(() => {
    clearFocus();
    onExitSeatView();
  }, [clearFocus, onExitSeatView]);

  useEffect(() => {
    setExitSeatSelect(handleExitSeatView);
    return () => setExitSeatSelect(null);
  }, [handleExitSeatView, setExitSeatSelect]);

  const exitVr = useCallback(async () => {
    const session = xrStore.getState().session;
    if (!session) return;
    clearFocus();
    handleExitSeatView();
    try {
      await session.end();
    } catch (e) {
      console.error('exit VR failed:', e);
    }
  }, [clearFocus, handleExitSeatView]);

  useEffect(() => {
    setExitVr(exitVr);
    return () => setExitVr(null);
  }, [exitVr, setExitVr]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') snapTurnLeft();
      if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') snapTurnRight();
      if (e.key === 'Escape') handleExitSeatView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleExitSeatView]);

  const handleSeatClick = (seat: Seat3D) => {
    onSeatFocus(seat);
    if (inVr) setFocusSeat(seat);
  };

  const enterVr = async () => {
    if (!xrSupported) {
      setError('Trình duyệt không hỗ trợ WebXR VR.');
      return;
    }
    setXrEntering(true);
    setError(null);
    try {
      const session = await xrStore.enterVR();
      if (!session) {
        setError('Không thể vào chế độ VR.');
        return;
      }
      if (previewSeat) setFocusSeat(previewSeat);
    } catch {
      setError('Không thể vào chế độ VR.');
    } finally {
      setXrEntering(false);
    }
  };

  const seatHint = previewSeat
    ? `Ghế ${seatLabel(previewSeat)}`
    : 'Chọn ghế trên sơ đồ 2D hoặc click nhãn ghế trong 3D';

  const experienceProps = {
    seats: seats3D,
    selectedIds: emptySelection,
    previewSeatId,
    viewFromSeat,
    modelPath: option.modelPath,
    onSelectSeat: handleSeatClick,
  };

  return (
    <div className="organizer-stage-viewer">
      <div className="organizer-stage-viewer__toolbar">
        <div className="organizer-stage-viewer__toolbar-info">
          <span>{option.label}</span>
          {viewFromSeat && previewSeat ? (
            <span className="organizer-stage-viewer__meta">Góc nhìn · {seatHint}</span>
          ) : (
            <span className="organizer-stage-viewer__meta">{seatHint}</span>
          )}
        </div>
        <div className="organizer-stage-viewer__toolbar-actions">
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={enterVr}
            disabled={xrEntering || !xrSupported}
          >
            {xrEntering ? 'Đang vào VR...' : inVr ? 'Đang trong VR' : 'Vào VR'}
          </button>
          {viewFromSeat ? (
            <button type="button" className="btn btn-outline btn-xs active" onClick={handleExitSeatView}>
              Thoát góc nhìn ghế
            </button>
          ) : null}
          <button type="button" className="btn btn-outline btn-xs" onClick={snapTurnLeft}>
            Xoay trái
          </button>
          <button type="button" className="btn btn-outline btn-xs" onClick={snapTurnRight}>
            Xoay phải
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error organizer-stage-viewer__alert">{error}</div> : null}

      <div className="organizer-stage-viewer__canvas">
        {option.id === 'stage1' ? (
          <Stage1VrExperience {...experienceProps} />
        ) : (
          <VrExperience {...experienceProps} onPreviewSeat={handleSeatClick} />
        )}
      </div>

      <p className="organizer-stage-viewer__hint">
        Click ghế trên sơ đồ 2D hoặc nhãn ghế 3D để xem góc nhìn · Kéo xoay · Cuộn zoom · Esc thoát góc nhìn
      </p>
    </div>
  );
}
