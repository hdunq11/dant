import { Text } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useState } from 'react';
import { DoubleSide } from 'three';
import type { Seat3D } from '../../../utils/seatMap3D';
import {
  buildStage1RowMetrics,
  STAGE1_TAG_PLANE_D,
  STAGE1_TAG_PLANE_W,
  stage1SeatLabel,
  stage1SeatTagPose,
} from '../../../utils/seatMap3DStage1';

interface Stage1SeatInstancesProps {
  seats: Seat3D[];
  selectedIds: Set<string>;
  previewSeatId: string | null;
  onSelect: (seat: Seat3D) => void;
}

function accentColor(seat: Seat3D, selected: boolean, previewing: boolean, hovered: boolean) {
  if (selected) return '#16a34a';
  if (previewing) return '#d97706';
  if (seat.status === 'sold') return '#94a3b8';
  if (seat.status === 'reserved' && !seat.reservedByMe) return '#ea580c';
  if (hovered) return '#6366f1';
  return seat.color;
}

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

const Stage1SeatTag = memo(function Stage1SeatTag({
  seat,
  selected,
  previewing,
  rowMetrics,
  onSelect,
}: {
  seat: Seat3D;
  selected: boolean;
  previewing: boolean;
  rowMetrics: ReturnType<typeof buildStage1RowMetrics>;
  onSelect: (seat: Seat3D) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const disabled = seat.selectable === false;
  const accent = accentColor(seat, selected, previewing, hovered);
  const faceColor = disabled ? '#e2e8f0' : accent;
  const textColor = contrastTextColor(faceColor, disabled);
  const { position, rotation } = stage1SeatTagPose(seat, rowMetrics);
  const label = stage1SeatLabel(seat);
  const highlight = selected || previewing;
  const scale = highlight ? 1.08 : hovered ? 1.04 : 1;

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
      <mesh position={[0, 0, -0.002]} renderOrder={1}>
        <planeGeometry args={[STAGE1_TAG_PLANE_W + 0.02, STAGE1_TAG_PLANE_D + 0.02]} />
        <meshStandardMaterial color={accent} roughness={0.85} side={DoubleSide} />
      </mesh>
      <mesh renderOrder={2} {...bindClick}>
        <planeGeometry args={[STAGE1_TAG_PLANE_W, STAGE1_TAG_PLANE_D]} />
        <meshStandardMaterial
          color={faceColor}
          roughness={0.95}
          metalness={0}
          emissive={highlight ? accent : '#000000'}
          emissiveIntensity={highlight ? 0.18 : 0}
          side={DoubleSide}
        />
      </mesh>
      <Text
        position={[0, 0, 0.006]}
        fontSize={0.052}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={STAGE1_TAG_PLANE_W - 0.02}
        renderOrder={3}
        {...bindClick}
      >
        {label}
      </Text>
    </group>
  );
});

export function Stage1SeatInstances({
  seats,
  selectedIds,
  previewSeatId,
  onSelect,
}: Stage1SeatInstancesProps) {
  const rowMetrics = useMemo(() => buildStage1RowMetrics(seats), [seats]);

  if (!seats.length) return null;

  return (
    <group pointerEventsType={{ deny: 'grab' }}>
      {seats.map((seat) => (
        <Stage1SeatTag
          key={seat.seatId}
          seat={seat}
          selected={selectedIds.has(seat.seatId)}
          previewing={previewSeatId === seat.seatId}
          rowMetrics={rowMetrics}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
