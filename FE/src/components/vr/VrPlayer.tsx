import { useEffect, useRef } from 'react';
import { TeleportTarget, XROrigin, useXR } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Vector3 } from 'three';
import { computeSeatOriginPose, type VrSpawn } from '../../utils/seatMap3D';
import { useVrFocusStore } from './vrFocusStore';

const MOVE_SPEED = 3.5;
const TURN_SPEED = 1.8;
const FLY_SPEED = 4;
const STICK_DEAD = 0.35;
const ARRIVE_EPS = 0.08;

function readStick(gp: Gamepad, handedness: string) {
  const axes = gp.axes;
  if (axes.length < 2) return { x: 0, z: 0, turn: 0 };

  if (handedness === 'left') {
    const x = Math.abs(axes[2] ?? axes[0] ?? 0) > STICK_DEAD ? (axes[2] ?? axes[0] ?? 0) : 0;
    const z = Math.abs(axes[3] ?? axes[1] ?? 0) > STICK_DEAD ? (axes[3] ?? axes[1] ?? 0) : 0;
    return { x, z, turn: 0 };
  }

  const turnAxis = axes[0] ?? 0;
  const turn = Math.abs(turnAxis) > 0.65 ? Math.sign(turnAxis) : 0;
  const x = Math.abs(axes[2] ?? 0) > STICK_DEAD ? axes[2] : 0;
  const z = Math.abs(axes[3] ?? 0) > STICK_DEAD ? axes[3] : 0;
  return { x, z, turn };
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

    let moveX = 0;
    let moveZ = 0;
    let turn = 0;

    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;
      const stick = readStick(gp, src.handedness);
      moveX += stick.x;
      moveZ += stick.z;
      turn += stick.turn;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const yaw = origin.rotation.y;
      const dx = (moveX * Math.cos(yaw) - moveZ * Math.sin(yaw)) * MOVE_SPEED * delta;
      const dz = (moveX * Math.sin(yaw) + moveZ * Math.cos(yaw)) * MOVE_SPEED * delta;
      origin.position.x += dx;
      origin.position.z += dz;
    }

    if (turn !== 0) {
      origin.rotation.y += turn * TURN_SPEED * delta;
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
