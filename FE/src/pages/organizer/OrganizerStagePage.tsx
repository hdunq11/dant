import { useCallback, useMemo, useState } from 'react';

import { ORGANIZER_STAGE_OPTIONS } from '../../constants/organizerStageCatalog';

import { OrganizerStage3DViewer } from '../../components/organizer/stage/OrganizerStage3DViewer';

import { OrganizerStage2DViewer } from '../../components/organizer/stage/OrganizerStage2DViewer';

import { PageHeader } from '../../components/portal/PageHeader';

import { buildOrganizerSeats3D } from '../../utils/organizerStageSeats';

import type { Seat3D } from '../../utils/seatMap3D';

import './OrganizerStagePage.css';



type StageViewMode = '2d' | '3d';



export function OrganizerStagePage() {

  const [activeId, setActiveId] = useState(ORGANIZER_STAGE_OPTIONS[0].id);

  const [viewMode, setViewMode] = useState<StageViewMode>('3d');

  const [previewSeatId, setPreviewSeatId] = useState<string | null>(null);

  const [viewFromSeat, setViewFromSeat] = useState(false);



  const active = ORGANIZER_STAGE_OPTIONS.find((o) => o.id === activeId) ?? ORGANIZER_STAGE_OPTIONS[0];

  const seats3D = useMemo(() => buildOrganizerSeats3D(active), [active.id]);
  const clickableSeatIds = useMemo(() => new Set(seats3D.map((s) => s.seatId)), [seats3D]);



  const resetSeatView = useCallback(() => {

    setPreviewSeatId(null);

    setViewFromSeat(false);

  }, []);



  const pickStage = (id: typeof activeId, mode: StageViewMode) => {

    if (id !== activeId) resetSeatView();

    setActiveId(id);

    setViewMode(mode);

  };



  const focusSeat = useCallback(

    (seat: Seat3D) => {

      setPreviewSeatId(seat.seatId);

      setViewFromSeat(true);

      setViewMode('3d');

    },

    []

  );



  const handleSeatClick2D = useCallback(

    (seatId: string) => {

      const seat = seats3D.find((s) => s.seatId === seatId);

      if (seat) focusSeat(seat);

    },

    [seats3D, focusSeat]

  );



  return (

    <div className="organizer-stage-page">

      <PageHeader

        title="Sân khấu"

        subtitle="Chọn layout — xem sơ đồ 2D, góc nhìn ghế 3D hoặc VR, không cần tạo venue."

      />



      <div className="organizer-stage-picker" role="tablist" aria-label="Chọn sân khấu">

        {ORGANIZER_STAGE_OPTIONS.map((opt) => {

          const isActive = activeId === opt.id;

          return (

            <article

              key={opt.id}

              role="tab"

              aria-selected={isActive}

              className={`organizer-stage-picker__card ${isActive ? 'active' : ''}`}

            >

              <button

                type="button"

                className="organizer-stage-picker__head"

                onClick={() => pickStage(opt.id, viewMode)}

              >

                <strong>{opt.label}</strong>

                <span>{opt.capacity} ghế</span>

                <small>{opt.description}</small>

              </button>

              <div className="organizer-stage-picker__views">

                <button

                  type="button"

                  className={`btn btn-sm ${isActive && viewMode === '2d' ? 'btn-primary' : 'btn-outline'}`}

                  onClick={() => pickStage(opt.id, '2d')}

                >

                  Xem 2D

                </button>

                <button

                  type="button"

                  className={`btn btn-sm ${isActive && viewMode === '3d' ? 'btn-primary' : 'btn-outline'}`}

                  onClick={() => pickStage(opt.id, '3d')}

                >

                  Xem 3D

                </button>

              </div>

            </article>

          );

        })}

      </div>



      {viewMode === '3d' ? (

        <OrganizerStage3DViewer

          option={active}

          seats3D={seats3D}

          previewSeatId={previewSeatId}

          viewFromSeat={viewFromSeat}

          onSeatFocus={focusSeat}

          onExitSeatView={resetSeatView}

        />

      ) : (

        <OrganizerStage2DViewer

          option={active}

          previewSeatId={previewSeatId}

          clickableSeatIds={clickableSeatIds}

          onSeatClick={handleSeatClick2D}

        />

      )}

    </div>

  );

}

