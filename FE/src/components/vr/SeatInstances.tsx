import { Text } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { memo, useState } from 'react';
import { DoubleSide } from 'three';
import { useXR } from '@react-three/xr';
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

const SeatTag = memo(function SeatTag({
  seat,
  selected,
  previewing,
  vrMode,
  onSelect,
}: {
  seat: Seat3D;
  selected: boolean;
  previewing: boolean;
  vrMode: boolean;
  onSelect: (seat: Seat3D) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const disabled = seat.selectable === false;
  const accent = accentColor(seat, selected, previewing, hovered);
  const { position, rotationY } = seatTagPose(seat);
  const label = seatLabel(seat);
  const highlight = selected || previewing;
  const scale = highlight ? 1.12 : hovered ? 1.06 : 1;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (disabled) return;
    onSelect(seat);
  };

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Khung tấm bìa — màu theo trạng thái */}
      <mesh position={[0, 0, -0.004]} renderOrder={1}>
        <planeGeometry args={[0.36, 0.26]} />
        <meshStandardMaterial color={accent} roughness={0.85} side={DoubleSide} />
      </mesh>
      {/* Mặt giấy bìa */}
      <mesh
        renderOrder={2}
        onClick={vrMode ? handleClick : undefined}
        onDoubleClick={vrMode ? undefined : handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!disabled) setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[0.33, 0.22]} />
        <meshStandardMaterial
          color={disabled ? '#e2e8f0' : '#faf3e0'}
          roughness={0.95}
          metalness={0}
          emissive={highlight ? accent : '#000000'}
          emissiveIntensity={highlight ? 0.18 : 0}
          side={DoubleSide}
        />
      </mesh>
      {/* Chữ số ghế */}
      <Text
        position={[0, 0, 0.008]}
        fontSize={0.1}
        color={disabled ? '#94a3b8' : '#1e293b'}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.3}
        renderOrder={3}
        onClick={vrMode ? handleClick : undefined}
        onDoubleClick={vrMode ? undefined : handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!disabled) setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
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
  const session = useXR((s) => s.session);
  const vrMode = !!session;

  if (!seats.length) return null;

  return (
    <group pointerEventsType={{ deny: 'grab' }}>
      {seats.map((seat) => (
        <SeatTag
          key={seat.seatId}
          seat={seat}
          selected={selectedIds.has(seat.seatId)}
          previewing={previewSeatId === seat.seatId}
          vrMode={vrMode}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
