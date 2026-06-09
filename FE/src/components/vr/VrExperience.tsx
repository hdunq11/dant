import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import type { Seat3D } from '../../utils/seatMap3D';
import { computeVrFraming, computeVrSpawn } from '../../utils/seatMap3D';
import { VenueScene } from './VenueScene';
import { VrFog } from './VrFog';
import { VrControllerButtons } from './VrControllerButtons';
import { VrPlayer } from './VrPlayer';
import { xrStore } from './xrStore';

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
  const hasVenueModel = !!modelPath;
  const framing = useMemo(() => computeVrFraming(seats, hasVenueModel), [seats, hasVenueModel]);
  const spawn = useMemo(() => computeVrSpawn(seats, hasVenueModel), [seats, hasVenueModel]);

  const scene = (
    <>
      <VrPlayer spawn={spawn} />
      <VrControllerButtons />
      <VenueScene
        seats={seats}
        selectedIds={selectedIds}
        previewSeatId={previewSeatId}
        viewFromSeat={viewFromSeat}
        modelPath={modelPath}
        framing={framing}
        spawn={spawn}
        onSelectSeat={onSelectSeat}
        onPreviewSeat={onPreviewSeat}
      />
    </>
  );

  return (
    <Canvas
      shadows
      frameloop="always"
      dpr={[1, 1.5]}
      camera={{ position: framing.position, fov: 55, near: 0.05, far: framing.fogFar + 40 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.xr.enabled = true;
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#020617']} />
      <XR store={xrStore}>
        <VrFog framing={framing} />
        {scene}
      </XR>
    </Canvas>
  );
}
