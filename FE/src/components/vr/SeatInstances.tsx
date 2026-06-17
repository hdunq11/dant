import { Text } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { memo, useState } from 'react';
import { DoubleSide } from 'three';
import type { Seat3D } from '../../utils/seatMap3D';
import { seatLabel, seatTagPose } from '../../utils/seatMap3D';

interface SeatInstancesProps {
  seats: Seat3D[];
  selectedIds: Set<string>;
  previewSeatId: string | null;
  onSelect: (seat: Seat3D) => void;
  onPreview?: (seat: Seat3D) => void;
}

function accentColor(seat: Seat3D, selected: boolean, previewing: boolean, hovered: boolean) {
  if (selected) return '#16a34a';
  if (previewing) return '#d97706';
  if (seat.status === 'sold') return '#94a3b8';
  if (seat.status === 'reserved' && !seat.reservedByMe) return '#ea580c';
  if (hovered) return '#6366f1';
  return seat.color;
}

/** Chữ tương phản trên nền màu zone */
function contrastTextColor(background: string, disabled: boolean): string {
  if (disabled) return '#64748b';
  const hex = background.replace('#', '');
  if (hex.length !== 6) return '#f8fafc';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? '#0f172a' : '#f8fafc';
}

const SeatTag = memo(function SeatTag({
  seat,
  selected,
  previewing,
  onSelect,
}: {
  seat: Seat3D;
  selected: boolean;
  previewing: boolean;
  onSelect: (seat: Seat3D) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const disabled = seat.selectable === false;
  const accent = accentColor(seat, selected, previewing, hovered);
  const faceColor = disabled ? '#e2e8f0' : accent;
  const textColor = contrastTextColor(faceColor, disabled);
  const { position, rotation } = seatTagPose(seat);
  const label = seatLabel(seat);
  const highlight = selected || previewing;
  const scale = highlight ? 1.12 : hovered ? 1.06 : 1;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(seat);
  };

  const bindClick = {
    onClick: handleClick,
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!disabled) setHovered(true);
    },
    onPointerOut: () => setHovered(false),
  };

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Khung tấm bìa — màu theo trạng thái */}
      <mesh position={[0, 0, -0.003]} renderOrder={1}>
        <planeGeometry args={[0.24, 0.17]} />
        <meshStandardMaterial color={accent} roughness={0.85} side={DoubleSide} />
      </mesh>
      {/* Mặt tấm bìa — hai mặt cùng màu zone */}
      <mesh
        renderOrder={2}
        {...bindClick}
      >
        <planeGeometry args={[0.22, 0.15]} />
        <meshStandardMaterial
          color={faceColor}
          roughness={0.95}
          metalness={0}
          emissive={highlight ? accent : '#000000'}
          emissiveIntensity={highlight ? 0.18 : 0}
          side={DoubleSide}
        />
      </mesh>
      {/* Chữ số ghế — hai mặt tấm bìa */}
      <Text
        position={[0, 0, 0.008]}
        fontSize={0.075}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.3}
        renderOrder={3}
        {...bindClick}
      >
        {label}
      </Text>
      <Text
        position={[0, 0, -0.008]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.075}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.3}
        renderOrder={3}
        {...bindClick}
      >
        {label}
      </Text>
    </group>
  );
});

export function SeatInstances({
  seats,
  selectedIds,
  previewSeatId,
  onSelect,
}: SeatInstancesProps) {
  if (!seats.length) return null;

  return (
    <group pointerEventsType={{ deny: 'grab' }}>
      {seats.map((seat) => (
        <SeatTag
          key={seat.seatId}
          seat={seat}
          selected={selectedIds.has(seat.seatId)}
          previewing={previewSeatId === seat.seatId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
