import { useMemo } from 'react';
import type { Seat3D } from '../../../utils/seatMap3D';
import { buildStage1RowMetrics, stage1SeatTagPose } from '../../../utils/seatMap3DStage1';
import { VrSeatSelector } from '../VrSeatSelector';

interface Stage1VrSeatSelectorProps {
  seats: Seat3D[];
  onSelect: (seat: Seat3D) => void;
}

export function Stage1VrSeatSelector({ seats, onSelect }: Stage1VrSeatSelectorProps) {
  const rowMetrics = useMemo(() => buildStage1RowMetrics(seats), [seats]);
  const getTagPosition = useMemo(
    () => (seat: Seat3D) => stage1SeatTagPose(seat, rowMetrics).position,
    [rowMetrics]
  );

  return <VrSeatSelector seats={seats} getTagPosition={getTagPosition} onSelect={onSelect} />;
}
