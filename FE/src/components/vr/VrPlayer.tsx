import { useEffect, useRef } from 'react';
import { TeleportTarget, XROrigin, useXR } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Vector3 } from 'three';
import type { VrSpawn } from '../../utils/seatMap3D';

const MOVE_SPEED = 3.5;
const TURN_SPEED = 1.8;
const STICK_DEAD = 0.35;

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

interface VrPlayerProps {
  spawn: VrSpawn;
}

export function VrPlayer({ spawn }: VrPlayerProps) {
  const session = useXR((s) => s.session);
  const originRef = useRef<Group>(null);
  const spawnRef = useRef(spawn);
  spawnRef.current = spawn;

  useEffect(() => {
    if (!session) return;

    const applySpawn = () => {
      const origin = originRef.current;
      if (!origin) return;
      const s = spawnRef.current;
      origin.position.set(...s.position);
      origin.rotation.set(0, s.rotationY, 0);
    };

    const id = requestAnimationFrame(applySpawn);
    return () => cancelAnimationFrame(id);
  }, [session, spawn.position, spawn.rotationY]);

  useFrame((_, delta) => {
    const origin = originRef.current;
    if (!origin || !session) return;

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
