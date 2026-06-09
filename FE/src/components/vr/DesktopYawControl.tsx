import { useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { useVrViewStore } from './vrViewStore';

interface DesktopYawControlProps {
  pivot: Vector3;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  viewFromSeat: boolean;
}

/** Xoay camera desktop — đồng bộ OrbitControls hoặc lookAt khi xem từ ghế */
export function DesktopYawControl({ pivot, controlsRef, viewFromSeat }: DesktopYawControlProps) {
  const session = useXR((s) => s.session);
  const { camera } = useThree();
  const offset = useRef(new Vector3());

  useFrame(() => {
    if (session) return;

    const yaw = useVrViewStore.getState().takeYaw();
    if (yaw === 0) return;

    const controls = controlsRef.current;
    if (controls && !viewFromSeat) {
      controls.setAzimuthalAngle(controls.getAzimuthalAngle() + yaw);
      controls.update();
      return;
    }

    offset.current.copy(camera.position).sub(pivot);
    offset.current.applyAxisAngle(new Vector3(0, 1, 0), yaw);
    camera.position.copy(pivot).add(offset.current);
    camera.lookAt(pivot);
  });

  return null;
}
