import { Instances, Instance } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import type { Seat3D } from '../../utils/seatMap3D';

interface SeatInstancesProps {
  seats: Seat3D[];
  selectedIds: Set<string>;
  previewSeatId: string | null;
  onSelect: (seat: Seat3D) => void;
  onPreview: (seat: Seat3D) => void;
}

function seatColor(seat: Seat3D, selected: boolean, previewing: boolean) {
  if (selected) return '#22c55e';
  if (previewing) return '#fbbf24';
  if (seat.status === 'sold') return '#9ca3af';
  if (seat.status === 'reserved') return '#f97316';
  return seat.color;
}

export function SeatInstances({
  seats,
  selectedIds,
  previewSeatId,
  onSelect,
  onPreview,
}: SeatInstancesProps) {
  if (!seats.length) return null;

  const pickSeat = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx == null || idx < 0 || idx >= seats.length) return null;
    return seats[idx];
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const seat = pickSeat(e);
    if (!seat || seat.status === 'sold' || seat.status === 'reserved') return;
    onSelect(seat);
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    const seat = pickSeat(e);
    if (!seat || seat.status === 'sold' || seat.status === 'reserved') return;
    onPreview(seat);
  };

  return (
    <Instances
      limit={seats.length}
      range={seats.length}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      frustumCulled
    >
      <boxGeometry args={[0.38, 0.45, 0.38]} />
      <meshStandardMaterial />
      {seats.map((seat) => {
        const selected = selectedIds.has(seat.seatId);
        const previewing = previewSeatId === seat.seatId;
        const scale = selected || previewing ? 1.15 : 1;
        return (
          <Instance
            key={seat.seatId}
            position={seat.position}
            scale={scale}
            color={seatColor(seat, selected, previewing)}
          />
        );
      })}
    </Instances>
  );
}
