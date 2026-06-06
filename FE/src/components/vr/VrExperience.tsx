import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import type { Seat3D } from '../../utils/seatMap3D';
import { computeVrFraming } from '../../utils/seatMap3D';
import { VenueScene } from './VenueScene';

export const xrStore = createXRStore({
  emulate: typeof window !== 'undefined' && window.location.hostname === 'localhost',
});

interface VrExperienceProps {
  seats: Seat3D[];
  selectedIds: Set<string>;
  previewSeatId: string | null;
  viewFromSeat: boolean;
  modelPath?: string | null;
  onSelectSeat: (seat: Seat3D) => void;
  onPreviewSeat: (seat: Seat3D) => void;
}

export function VrExperience({
  seats,
  selectedIds,
  previewSeatId,
  viewFromSeat,
  modelPath,
  onSelectSeat,
  onPreviewSeat,
}: VrExperienceProps) {
  const framing = useMemo(
    () => computeVrFraming(seats, !!modelPath),
    [seats, modelPath]
  );

  return (
    <Canvas
      shadows
      camera={{ position: framing.position, fov: 55, near: 0.1, far: framing.fogFar + 20 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', framing.fogNear, framing.fogFar]} />
      <XR store={xrStore}>
        <VenueScene
          seats={seats}
          selectedIds={selectedIds}
          previewSeatId={previewSeatId}
          viewFromSeat={viewFromSeat}
          modelPath={modelPath}
          framing={framing}
          onSelectSeat={onSelectSeat}
          onPreviewSeat={onPreviewSeat}
        />
      </XR>
    </Canvas>
  );
}
