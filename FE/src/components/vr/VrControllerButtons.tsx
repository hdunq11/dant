import {
  useXR,
  useXRControllerButtonEvent,
  useXRInputSourceState,
} from '@react-three/xr';
import { useVrFocusStore } from './vrFocusStore';

/** Nút A/B tay phải Quest — thoát góc ghế / thoát VR */
export function VrControllerButtons() {
  const session = useXR((s) => s.session);
  const rightController = useXRInputSourceState('controller', 'right');

  useXRControllerButtonEvent(rightController, 'a-button', (state) => {
    if (!session || state !== 'pressed') return;
    useVrFocusStore.getState().exitSeatSelect?.();
  });

  useXRControllerButtonEvent(rightController, 'b-button', (state) => {
    if (!session || state !== 'pressed') return;
    useVrFocusStore.getState().exitVr?.();
  });

  return null;
}
