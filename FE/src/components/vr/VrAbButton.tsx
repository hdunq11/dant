import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useVrFocusStore } from './vrFocusStore';

/** Quest: nút A (tay phải) = buttons[4] */
const A_BUTTON_INDEX = 4;

function isPressed(btn: GamepadButton | undefined) {
  return !!btn && (btn.pressed || btn.value > 0.5);
}

export function VrAbButton() {
  const session = useXR((s) => s.session);
  const wasDown = useRef(false);

  useFrame(() => {
    if (!session) {
      wasDown.current = false;
      return;
    }

    let aDown = false;
    for (const src of session.inputSources) {
      if (src.handedness !== 'right') continue;
      const gp = src.gamepad;
      if (!gp) continue;
      if (isPressed(gp.buttons[A_BUTTON_INDEX])) {
        aDown = true;
        break;
      }
    }

    if (aDown && !wasDown.current) {
      useVrFocusStore.getState().exitSeatSelect?.();
    }
    wasDown.current = aDown;
  });

  return null;
}
