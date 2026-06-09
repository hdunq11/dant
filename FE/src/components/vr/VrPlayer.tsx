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
const STICK_DEAD = 0.35;
const SNAP_STICK_THRESHOLD = 0.55;
const SNAP_COOLDOWN = 0.4;
const ARRIVE_EPS = 0.08;

function readMoveStick(gp: Gamepad) {
  const axes = gp.axes;
  if (axes.length < 2) return { x: 0, z: 0 };

  const pairs: [number, number][] = [
    [axes[2] ?? 0, axes[3] ?? 0],
    [axes[0] ?? 0, axes[1] ?? 0],
  ];

  for (const [rawX, rawZ] of pairs) {
    const x = Math.abs(rawX) > STICK_DEAD ? rawX : 0;
    const z = Math.abs(rawZ) > STICK_DEAD ? rawZ : 0;
    if (x !== 0 || z !== 0) return { x, z };
  }
  return { x: 0, z: 0 };
}

function readTurnAxis(gp: Gamepad): number {
  const axes = gp.axes;
  const candidates = [axes[2], axes[0]].filter((v): v is number => v != null);
  let best = 0;
  for (const v of candidates) {
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
  spawnRef.current = spawn;

  const applySpawn = () => {
    const origin = originRef.current;
    if (!origin) return;
    const s = spawnRef.current;
    origin.position.set(...s.position);
    origin.rotation.set(0, s.rotationY, 0);
    flyTarget.current = null;
    isFlying.current = false;
  };

  useEffect(() => {
    if (!session) {
      flyTarget.current = null;
      isFlying.current = false;
      return;
    }
    const id = requestAnimationFrame(applySpawn);
    return () => cancelAnimationFrame(id);
  }, [session, spawn.position, spawn.rotationY]);

  useEffect(() => {
    if (!session) return;

    if (focusSeat) {
      const pose = computeSeatOriginPose(focusSeat, spawn.floorY);
      flyTarget.current = {
        position: new Vector3(...pose.position),
        rotationY: pose.rotationY,
      };
      isFlying.current = true;
      return;
    }

    const s = spawnRef.current;
    flyTarget.current = {
      position: new Vector3(...s.position),
      rotationY: s.rotationY,
    };
    isFlying.current = true;
  }, [focusSeat, session, spawn.floorY]);

  useFrame((_, delta) => {
    const origin = originRef.current;
    if (!origin || !session) return;

    const target = flyTarget.current;
    if (target && isFlying.current) {
      origin.position.lerp(target.position, Math.min(1, delta * FLY_SPEED));
      origin.rotation.y = lerpAngle(origin.rotation.y, target.rotationY, delta * FLY_SPEED);

      const arrived =
        origin.position.distanceTo(target.position) < ARRIVE_EPS &&
        Math.abs(origin.rotation.y - target.rotationY) < 0.05;
      if (arrived) {
        origin.position.copy(target.position);
        origin.rotation.y = target.rotationY;
        isFlying.current = false;
      }
      return;
    }

    const queuedYaw = useVrViewStore.getState().takeYaw();
    if (queuedYaw !== 0) {
      origin.rotation.y += queuedYaw;
    }

    snapCooldown.current = Math.max(0, snapCooldown.current - delta);

    let moveX = 0;
    let moveZ = 0;

    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;

      if (src.handedness === 'left' || src.handedness === 'none') {
        const move = readMoveStick(gp);
        moveX += move.x;
        moveZ += move.z;
      }

      if (src.handedness === 'right') {
        const turnAxis = readTurnAxis(gp);
        if (
          Math.abs(turnAxis) >= SNAP_STICK_THRESHOLD &&
          snapCooldown.current <= 0
        ) {
          const dir = Math.sign(turnAxis);
          if (dir !== lastSnapDir.current || snapCooldown.current <= 0) {
            origin.rotation.y -= dir * SNAP_TURN_RAD;
            snapCooldown.current = SNAP_COOLDOWN;
            lastSnapDir.current = dir;
          }
        } else if (Math.abs(turnAxis) < SNAP_STICK_THRESHOLD * 0.5) {
          lastSnapDir.current = 0;
        }
      }
    }

    if (moveX !== 0 || moveZ !== 0) {
      const yaw = origin.rotation.y;
      const dx = (moveX * Math.cos(yaw) - moveZ * Math.sin(yaw)) * MOVE_SPEED * delta;
      const dz = (moveX * Math.sin(yaw) + moveZ * Math.cos(yaw)) * MOVE_SPEED * delta;
      origin.position.x += dx;
      origin.position.z += dz;
    }
  });

  const handleTeleport = (point: Vector3) => {
    const origin = originRef.current;
    if (!origin) return;
    origin.position.set(point.x, spawn.floorY, point.z);
    flyTarget.current = null;
    isFlying.current = false;
    useVrFocusStore.getState().clearFocus();
  };

  if (!session) return null;

  return (
    <>
      <XROrigin ref={originRef} />
      <TeleportTarget onTeleport={handleTeleport}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={spawn.floorCenter}>
          <planeGeometry args={[spawn.floorW, spawn.floorD]} />
          <meshBasicMaterial transparent opacity={0.01} depthWrite={false} />
        </mesh>
      </TeleportTarget>
    </>
  );
}
