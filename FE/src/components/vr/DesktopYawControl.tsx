import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { Vector3 } from 'three';
import { useVrViewStore } from './vrViewStore';

interface DesktopYawControlProps {
  pivot: Vector3;
}

/** Xoay camera desktop quanh tâm scene (nút UI / phím tắt) */
export function DesktopYawControl({ pivot }: DesktopYawControlProps) {
  const session = useXR((s) => s.session);
  const { camera } = useThree();
  const offset = useRef(new Vector3());

  useFrame(() => {
    if (session) return;

    const yaw = useVrViewStore.getState().takeYaw();
    if (yaw === 0) return;

    offset.current.copy(camera.position).sub(pivot);
    offset.current.applyAxisAngle(new Vector3(0, 1, 0), yaw);
    camera.position.copy(pivot).add(offset.current);
    camera.lookAt(pivot);
  });

  return null;
}
