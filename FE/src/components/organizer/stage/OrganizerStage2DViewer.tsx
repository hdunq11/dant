import { useMemo, useState } from 'react';
import { SeatIcon } from '../../SeatIcon';
import type { OrganizerStageOption } from '../../../constants/organizerStageCatalog';
import { buildOrganizerSchematicZones, ORGANIZER_UNIFIED_SEAT_COLOR } from '../../../utils/organizerStageSchematic';
import { layoutSeatMapZones } from '../../../utils/seatMapLayout';
import { layoutStage1SeatMapZones } from '../../../utils/seatMapLayoutStage1';
import './OrganizerStageModelViewer.css';
import './OrganizerStage2DViewer.css';

interface OrganizerStage2DViewerProps {
  option: OrganizerStageOption;
  previewSeatId: string | null;
  clickableSeatIds: Set<string>;
  onSeatClick: (seatId: string) => void;
}

export function OrganizerStage2DViewer({
  option,
  previewSeatId,
  clickableSeatIds,
  onSeatClick,
}: OrganizerStage2DViewerProps) {
  const [zoom, setZoom] = useState(1);
  const zones = useMemo(() => buildOrganizerSchematicZones(option), [option.id]);

  const { zoneLayouts, canvasW, canvasH, stageWidth } = useMemo(() => {
    if (option.id === 'stage1') {
      return layoutStage1SeatMapZones(zones);
    }
    const base = layoutSeatMapZones(zones);
    return { ...base, stageWidth: undefined as number | undefined };
  }, [zones, option.id]);

  return (
    <div className="organizer-stage-viewer organizer-stage-viewer--2d">
      <div className="organizer-stage-viewer__toolbar">
        <span>{option.label} · Sơ đồ 2D</span>
        <span className="organizer-stage-viewer__meta">{option.capacity} ghế · sơ đồ layout</span>
      </div>

      <div className="organizer-stage-2d-arena">
        <div className="organizer-stage-2d-viewport">
          <div
            className="organizer-stage-2d-canvas"
            style={{
              width: canvasW,
              height: canvasH,
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <div
              className="organizer-stage-2d-stage"
              style={stageWidth ? { width: stageWidth, maxWidth: 'none' } : undefined}
            >
              Sân khấu
            </div>
            {zoneLayouts.map((layout) => (
              <div
                key={layout.zoneId}
                className="organizer-stage-2d-block"
                style={{
                  left: layout.x,
                  top: layout.y,
                  width: layout.width,
                  height: layout.height,
                  transform: `rotate(${layout.rotate}deg)`,
                }}
              >
                <div className="organizer-stage-2d-seats">
                  {layout.seats.map((seat) => {
                    const label =
                      seat.globalNumber != null ? `#${seat.globalNumber}` : `${seat.row}${seat.number}`;
                    const canView3D = clickableSeatIds.has(seat.seatId);
                    return (
                      <button
                        key={seat.seatId}
                        type="button"
                        className={`organizer-stage-2d-seat ${previewSeatId === seat.seatId ? 'organizer-stage-2d-seat--active' : ''} ${!canView3D ? 'organizer-stage-2d-seat--muted' : ''}`}
                        title={
                          canView3D
                            ? `${label} — click để xem góc nhìn 3D`
                            : `${label} — không có mesh ghế trong model 3D`
                        }
                        style={{
                          left: seat.x - layout.x,
                          top: seat.y - layout.y,
                          color: ORGANIZER_UNIFIED_SEAT_COLOR,
                        }}
                        disabled={!canView3D}
                        onClick={() => onSeatClick(seat.seatId)}
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
        <div className="organizer-stage-2d-zoom">
          <button type="button" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} aria-label="Phóng to">
            +
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} aria-label="Thu nhỏ">
            −
          </button>
        </div>
      </div>

      <p className="organizer-stage-viewer__hint">
        Click ghế để chuyển sang xem 3D tại vị trí ghế đó · Chỉ xem mẫu, không đặt vé.
      </p>
    </div>
  );
}
