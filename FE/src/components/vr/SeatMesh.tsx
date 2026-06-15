import { Text } from '@react-three/drei';
import { useState } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { DoubleSide } from 'three';
import type { Seat3D } from '../../utils/seatMap3D';
import { seatLabel, seatTagPose } from '../../utils/seatMap3D';

interface SeatMeshProps {
  seat: Seat3D;
  selected: boolean;
  previewing: boolean;
  onSelect: (seat: Seat3D) => void;
  onPreview: (seat: Seat3D) => void;
}

function accentColor(seat: Seat3D, selected: boolean, previewing: boolean, hovered: boolean) {
  if (selected) return '#16a34a';
  if (previewing) return '#d97706';
  if (seat.status === 'sold') return '#94a3b8';
  if (seat.status === 'reserved' && !seat.reservedByMe) return '#ea580c';
  if (hovered) return '#6366f1';
  return seat.color;
}

export function SeatMesh({ seat, selected, previewing, onSelect, onPreview }: SeatMeshProps) {
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

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (disabled) return;
    onPreview(seat);
  };

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0, -0.004]}>
        <planeGeometry args={[0.36, 0.26]} />
        <meshStandardMaterial color={accent} roughness={0.85} side={DoubleSide} />
      </mesh>
      <mesh
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
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
          emissive={highlight ? accent : '#000000'}
          emissiveIntensity={highlight ? 0.18 : 0}
          side={DoubleSide}
        />
      </mesh>
      <Text position={[0, 0, 0.008]} fontSize={0.1} color={disabled ? '#94a3b8' : '#1e293b'} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}
