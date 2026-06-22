import { useXR, useXRInputSourceEvent } from '@react-three/xr';
import { useThree } from '@react-three/fiber';
import { Quaternion, Vector3 } from 'three';
import type { Seat3D } from '../../utils/seatMap3D';

const _origin = new Vector3();
const _direction = new Vector3();
const _quat = new Quaternion();
const _toSeat = new Vector3();
const _tagPos = new Vector3();
const _closest = new Vector3();

const HIT_RADIUS = 0.4;

interface VrSeatSelectorProps {
  seats: Seat3D[];
  getTagPosition: (seat: Seat3D) => [number, number, number];
  onSelect: (seat: Seat3D) => void;
}

function pickSeatAlongRay(
  seats: Seat3D[],
  origin: Vector3,
  direction: Vector3,
  getTagPosition: (seat: Seat3D) => [number, number, number]
): Seat3D | null {
  const dx = direction.x;
  const dy = direction.y;
  const dz = direction.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return null;

  const ndx = dx / len;
  const ndy = dy / len;
  const ndz = dz / len;

  let best: Seat3D | null = null;
  let bestT = Infinity;

  for (const seat of seats) {
    if (seat.selectable === false || seat.status === 'sold') continue;

    const [tx, ty, tz] = getTagPosition(seat);
    _tagPos.set(tx, ty, tz);
    _toSeat.subVectors(_tagPos, origin);
    const t = _toSeat.x * ndx + _toSeat.y * ndy + _toSeat.z * ndz;
    if (t < 0.15) continue;

    _closest.set(
      origin.x + ndx * t,
      origin.y + ndy * t,
      origin.z + ndz * t
    );
    const perp = _closest.distanceTo(_tagPos);
    if (perp <= HIT_RADIUS && t < bestT) {
      bestT = t;
      best = seat;
    }
  }

  return best;
}

/** Chọn ghế bằng trigger tay cầm VR (raycast từ tia controller). */
export function VrSeatSelector({ seats, getTagPosition, onSelect }: VrSeatSelectorProps) {
  const session = useXR((s) => s.session);
  const { gl } = useThree();

  useXRInputSourceEvent(
    session ? 'all' : undefined,
    'selectstart',
    (event) => {
      const frame = event.frame;
      const refSpace = gl.xr.getReferenceSpace();
      if (!refSpace) return;

      const pose = frame.getPose(event.inputSource.targetRaySpace, refSpace);
      if (!pose) return;

      const pos = pose.transform.position;
      const ori = pose.transform.orientation;
      _origin.set(pos.x, pos.y, pos.z);
      _quat.set(ori.x, ori.y, ori.z, ori.w);
      _direction.set(0, 0, -1).applyQuaternion(_quat);

      const hit = pickSeatAlongRay(seats, _origin, _direction, getTagPosition);
      if (hit) onSelect(hit);
    },
    [seats, getTagPosition, onSelect, session, gl]
  );

  return null;
}
