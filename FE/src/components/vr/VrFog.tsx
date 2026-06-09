import { useXR } from '@react-three/xr';
import type { VrFraming } from '../../utils/seatMap3D';

export function VrFog({ framing }: { framing: VrFraming }) {
  const session = useXR((s) => s.session);
  if (session) return null;
  return <fog attach="fog" args={['#020617', framing.fogNear, framing.fogFar]} />;
}
