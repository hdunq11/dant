import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { Vector3 } from 'three';
import type { Seat3D, VrFraming, VrSpawn } from '../../utils/seatMap3D';
import { STAGE_CENTER, STAGE_LOOK_AT, seatViewPosition } from '../../utils/seatMap3D';
import { DesktopYawControl } from './DesktopYawControl';
import { SeatInstances } from './SeatInstances';
import { VenueModel } from './VenueModel';

interface VenueSceneProps {
  seats: Seat3D[];
  selectedIds: Set<string>;
  previewSeatId: string | null;
  viewFromSeat: boolean;
  modelPath?: string | null;
  framing: VrFraming;
  spawn: VrSpawn;
  onSelectSeat: (seat: Seat3D) => void;
  onPreviewSeat: (seat: Seat3D) => void;
}

function SceneCamera({ framing }: { framing: VrFraming }) {
  const { camera, gl } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || gl.xr.isPresenting) return;
    camera.position.set(...framing.position);
    initialized.current = true;
  }, [camera, framing, gl.xr]);

  return null;
}

function VrFloorGuide({ spawn }: { spawn: VrSpawn }) {
  const session = useXR((s) => s.session);
  if (!session) return null;

  return (
    <group position={[spawn.floorCenter[0], spawn.floorY, spawn.floorCenter[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[spawn.floorW, spawn.floorD]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      <gridHelper args={[spawn.floorW, 24, '#475569', '#1e293b']} position={[0, 0.02, 0]} />
    </group>
  );
}

class VenueModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function FallbackStage() {
  return (
    <group position={STAGE_CENTER}>
      <mesh receiveShadow>
        <boxGeometry args={[8, 0.5, 4]} />
        <meshStandardMaterial color="#312e81" emissive="#4338ca" emissiveIntensity={0.35} />
      </mesh>
      <Text position={[0, 1.2, 0]} fontSize={0.6} color="#e0e7ff" anchorX="center" anchorY="middle">
        SÂN KHẤU
      </Text>
    </group>
  );
}

function SeatViewCamera({
  seat,
  active,
}: {
  seat: Seat3D | null;
  active: boolean;
}) {
  const { camera } = useThree();
  const target = useRef(new Vector3());
  const lookAt = useRef(new Vector3(...STAGE_LOOK_AT));

  useEffect(() => {
    if (seat && active) {
      const [x, y, z] = seatViewPosition(seat);
      target.current.set(x, y, z);
    }
  }, [seat, active]);

  useFrame((_, delta) => {
    if (!seat || !active) return;
    camera.position.lerp(target.current, Math.min(1, delta * 4));
    camera.lookAt(lookAt.current);
  });

  return null;
}

export function VenueScene({
  seats,
  selectedIds,
  previewSeatId,
  viewFromSeat,
  modelPath,
  framing,
  spawn,
  onSelectSeat,
  onPreviewSeat,
}: VenueSceneProps) {
  const previewSeat = seats.find((s) => s.seatId === previewSeatId) ?? null;
  const orbitTarget = useMemo(() => new Vector3(...framing.target), [framing.target]);
  const xrSession = useXR((s) => s.session);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <>
      <SceneCamera framing={framing} />
      <hemisphereLight args={['#c4b5fd', '#0f172a', 0.85]} />
      <ambientLight intensity={xrSession ? 0.9 : 0.65} />
      <directionalLight position={[5, 12, 8]} intensity={1.4} castShadow={!xrSession} />
      <directionalLight position={[-4, 6, -2]} intensity={0.5} color="#c4b5fd" />

      <VrFloorGuide spawn={spawn} />

      <VenueModelErrorBoundary fallback={<FallbackStage />}>
        <Suspense fallback={null}>
          {modelPath ? <VenueModel path={modelPath} /> : <FallbackStage />}
        </Suspense>
      </VenueModelErrorBoundary>

      <SeatInstances
        seats={seats}
        selectedIds={selectedIds}
        previewSeatId={previewSeatId}
        onSelect={onSelectSeat}
        onPreview={onPreviewSeat}
      />

      <SeatViewCamera seat={previewSeat} active={viewFromSeat && !xrSession} />

      <DesktopYawControl
        pivot={orbitTarget}
        controlsRef={orbitControlsRef}
        viewFromSeat={viewFromSeat}
      />

      {!xrSession ? (
        <OrbitControls
          ref={orbitControlsRef}
          enabled={!viewFromSeat}
          target={orbitTarget}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={2}
          maxDistance={framing.maxDistance}
          enablePan
          enableDamping
          dampingFactor={0.08}
        />
      ) : null}
    </>
  );
}
