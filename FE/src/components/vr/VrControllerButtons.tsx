import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useVrFocusStore } from './vrFocusStore';

/** Quest tay phải: A = buttons[4], B = buttons[5] */
const A_BUTTON_INDEX = 4;
const B_BUTTON_INDEX = 5;

function isPressed(btn: GamepadButton | undefined) {
  return !!btn && (btn.pressed || btn.value > 0.5);
}

function readRightButtons(session: XRSession) {
  let a = false;
  let b = false;
  for (const src of session.inputSources) {
    if (src.handedness !== 'right') continue;
    const gp = src.gamepad;
    if (!gp) continue;
    if (isPressed(gp.buttons[A_BUTTON_INDEX])) a = true;
    if (isPressed(gp.buttons[B_BUTTON_INDEX])) b = true;
  }
  return { a, b };
}

export function VrControllerButtons() {
  const session = useXR((s) => s.session);
  const wasADown = useRef(false);
  const wasBDown = useRef(false);

  useFrame(() => {
    if (!session) {
      wasADown.current = false;
      wasBDown.current = false;
      return;
    }

    const { a, b } = readRightButtons(session);

    if (a && !wasADown.current) {
      useVrFocusStore.getState().exitSeatSelect?.();
    }
    wasADown.current = a;

    if (b && !wasBDown.current) {
      useVrFocusStore.getState().exitVr?.();
    }
    wasBDown.current = b;
  });

  return null;
}
