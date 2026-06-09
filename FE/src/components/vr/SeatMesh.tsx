import { useRef, useState } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Seat3D } from '../../utils/seatMap3D';

interface SeatMeshProps {
  seat: Seat3D;
  selected: boolean;
  previewing: boolean;
  onSelect: (seat: Seat3D) => void;
  onPreview: (seat: Seat3D) => void;
}

function seatColor(seat: Seat3D, selected: boolean, previewing: boolean, hovered: boolean) {
  if (selected) return '#22c55e';
  if (previewing) return '#fbbf24';
  if (seat.status === 'sold') return '#9ca3af';
  if (seat.status === 'reserved' && !seat.reservedByMe) return '#f97316';
  if (hovered) return '#818cf8';
  return seat.color;
}

export function SeatMesh({ seat, selected, previewing, onSelect, onPreview }: SeatMeshProps) {
  const ref = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const disabled = seat.selectable === false;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (disabled) return;
    onSelect(seat);
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (disabled) return;
    onPreview(seat);
  };

  return (
    <mesh
      ref={ref}
      position={seat.position}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!disabled) setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      scale={hovered || selected ? 1.15 : 1}
    >
      <boxGeometry args={[0.38, 0.45, 0.38]} />
      <meshStandardMaterial
        color={seatColor(seat, selected, previewing, hovered)}
        emissive={selected || previewing ? seatColor(seat, selected, previewing, hovered) : '#000000'}
        emissiveIntensity={selected || previewing ? 0.25 : hovered ? 0.1 : 0}
      />
    </mesh>
  );
}
