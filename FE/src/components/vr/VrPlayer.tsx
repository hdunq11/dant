import { useEffect, useRef } from 'react';
import { TeleportTarget, XROrigin, useXR } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Vector3 } from 'three';
import { computeSeatOriginPose, type VrSpawn } from '../../utils/seatMap3D';
import { useVrFocusStore } from './vrFocusStore';
import { SNAP_TURN_RAD, useVrViewStore } from './vrViewStore';

const MOVE_SPEED = 3.5;
const FLY_SPEED = 4;
const STICK_DEAD = 0.3;
const SNAP_STICK_THRESHOLD = 0.5;
const SMOOTH_TURN_SPEED = 2.2;
const SNAP_COOLDOWN = 0.35;
const ARRIVE_EPS = 0.12;

function readMoveStick(gp: Gamepad) {
  const axes = gp.axes;
  const pairs: [number, number][] = [
    [axes[0] ?? 0, axes[1] ?? 0],
    [axes[2] ?? 0, axes[3] ?? 0],
  ];

  for (const [rawX, rawZ] of pairs) {
    const x = Math.abs(rawX) > STICK_DEAD ? rawX : 0;
    const z = Math.abs(rawZ) > STICK_DEAD ? rawZ : 0;
    if (x !== 0 || z !== 0) return { x, z };
  }
  return { x: 0, z: 0 };
}

/** Trục ngang thumbstick (Quest: axis 0 hoặc 2) */
function readTurnAxis(gp: Gamepad): number {
  const axes = gp.axes;
  let best = 0;
  for (const idx of [0, 2]) {
    const v = axes[idx] ?? 0;
    if (Math.abs(v) > Math.abs(best)) best = v;
  }
  return best;
}

function lerpAngle(from: number, to: number, t: number) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * Math.min(1, t);
}

function angleDelta(a: number, b: number) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

function spawnPose(spawn: VrSpawn) {
  return {
    position: new Vector3(...spawn.position),
    rotationY: spawn.rotationY,
  };
}

interface VrPlayerProps {
  spawn: VrSpawn;
}

export function VrPlayer({ spawn }: VrPlayerProps) {
  const session = useXR((s) => s.session);
  const focusSeat = useVrFocusStore((s) => s.focusSeat);
  const originRef = useRef<Group>(null);
  const spawnRef = useRef(spawn);
  const flyTarget = useRef<{ position: Vector3; rotationY: number } | null>(null);
  const isFlying = useRef(false);
  const snapCooldown = useRef(0);
  const lastSnapDir = useRef(0);
  const hadFocus = useRef(false);
  const spawnPending = useRef(false);
  spawnRef.current = spawn;

  const cancelFly = () => {
    isFlying.current = false;
    flyTarget.current = null;
  };

  const applySpawn = () => {
    const origin = originRef.current;
    if (!origin) return;
    const s = spawnRef.current;
    origin.position.set(...s.position);
    origin.rotation.set(0, s.rotationY, 0);
    cancelFly();
  };

  const flyToSpawn = () => {
    flyTarget.current = spawnPose(spawnRef.current);
    isFlying.current = true;
  };

  useEffect(() => {
    if (!session) {
      cancelFly();
      hadFocus.current = false;
      spawnPending.current = false;
      return;
    }
    // Chỉ reset vị trí khi mới vào VR — không khi spawn/seats đổi (poll sơ đồ ghế)
    spawnPending.current = true;
  }, [session]);

  useEffect(() => {
    if (!session) return;

    if (focusSeat) {
      hadFocus.current = true;
      const pose = computeSeatOriginPose(focusSeat, spawnRef.current.floorY);
      flyTarget.current = {
        position: new Vector3(...pose.position),
        rotationY: pose.rotationY,
      };
      isFlying.current = true;
      return;
    }

    if (hadFocus.current) {
      hadFocus.current = false;
      flyToSpawn();
      return;
    }

    cancelFly();
  }, [focusSeat, session]);

  useFrame((_, delta) => {
    const origin = originRef.current;
    if (!origin || !session) return;

    if (spawnPending.current) {
      if (!useVrFocusStore.getState().focusSeat) {
        applySpawn();
      }
      spawnPending.current = false;
    }

    const queuedYaw = useVrViewStore.getState().takeYaw();
    if (queuedYaw !== 0) {
      cancelFly();
      origin.rotation.y += queuedYaw;
    }

    snapCooldown.current = Math.max(0, snapCooldown.current - delta);

    let moveX = 0;
    let moveZ = 0;
    let smoothTurn = 0;

    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;

      if (src.handedness === 'left' || src.handedness === 'none') {
        const move = readMoveStick(gp);
        moveX += move.x;
        moveZ += move.z;
      }

      const turnAxis = readTurnAxis(gp);
      const absTurn = Math.abs(turnAxis);

      if (absTurn >= SNAP_STICK_THRESHOLD && snapCooldown.current <= 0) {
        cancelFly();
        const dir = Math.sign(turnAxis);
        origin.rotation.y -= dir * SNAP_TURN_RAD;
        snapCooldown.current = SNAP_COOLDOWN;
        lastSnapDir.current = dir;
      } else if (absTurn > STICK_DEAD && absTurn < SNAP_STICK_THRESHOLD) {
        cancelFly();
        smoothTurn += turnAxis;
        lastSnapDir.current = 0;
      } else if (absTurn <= STICK_DEAD) {
        if (src.handedness === 'right') lastSnapDir.current = 0;
      }
    }

    if (smoothTurn !== 0) {
      origin.rotation.y -= smoothTurn * SMOOTH_TURN_SPEED * delta;
    }

    if (moveX !== 0 || moveZ !== 0) {
      cancelFly();
      const yaw = origin.rotation.y;
      const dx = (moveX * Math.cos(yaw) - moveZ * Math.sin(yaw)) * MOVE_SPEED * delta;
      const dz = (moveX * Math.sin(yaw) + moveZ * Math.cos(yaw)) * MOVE_SPEED * delta;
      origin.position.x += dx;
      origin.position.z += dz;
    }

    const target = flyTarget.current;
    if (target && isFlying.current) {
      origin.position.lerp(target.position, Math.min(1, delta * FLY_SPEED));
      origin.rotation.y = lerpAngle(origin.rotation.y, target.rotationY, delta * FLY_SPEED);

      const arrived =
        origin.position.distanceTo(target.position) < ARRIVE_EPS &&
        angleDelta(origin.rotation.y, target.rotationY) < 0.1;
      if (arrived) {
        origin.position.copy(target.position);
        origin.rotation.y = target.rotationY;
        cancelFly();
      }
    }
  });

  const handleTeleport = (point: Vector3) => {
    const origin = originRef.current;
    if (!origin) return;
    origin.position.set(point.x, spawn.floorY, point.z);
    cancelFly();
    useVrFocusStore.getState().clearFocus();
  };

  return (
    <>
      <XROrigin ref={originRef} />
      {session && !focusSeat ? (
        <TeleportTarget onTeleport={handleTeleport}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={spawn.floorCenter}>
            <planeGeometry args={[spawn.floorW, spawn.floorD]} />
            <meshBasicMaterial transparent opacity={0.01} depthWrite={false} />
          </mesh>
        </TeleportTarget>
      ) : null}
    </>
  );
}
