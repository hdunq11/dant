import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import type { Seat3D } from '../../../utils/seatMap3D';
import { computeStage1VrFraming, computeStage1VrSpawn } from '../../../utils/seatMap3DStage1';
import { VrFog } from '../VrFog';
import { VrControllerButtons } from '../VrControllerButtons';
import { VrPlayer } from '../VrPlayer';
import { xrStore } from '../xrStore';
import { Stage1VenueScene } from './Stage1VenueScene';

interface Stage1VrExperienceProps {
  seats: Seat3D[];
  selectedIds: Set<string>;
  previewSeatId: string | null;
  viewFromSeat: boolean;
  modelPath?: string | null;
  onSelectSeat: (seat: Seat3D) => void;
}

export function Stage1VrExperience({
  seats,
  selectedIds,
  previewSeatId,
  viewFromSeat,
  modelPath,
  onSelectSeat,
}: Stage1VrExperienceProps) {
  const framing = useMemo(() => computeStage1VrFraming(seats), [seats]);
  const spawn = useMemo(() => computeStage1VrSpawn(seats), [seats]);

  const scene = (
    <>
      <VrPlayer spawn={spawn} />
      <VrControllerButtons />
      <Stage1VenueScene
        seats={seats}
        selectedIds={selectedIds}
        previewSeatId={previewSeatId}
        viewFromSeat={viewFromSeat}
        modelPath={modelPath}
        framing={framing}
        spawn={spawn}
        onSelectSeat={onSelectSeat}
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
