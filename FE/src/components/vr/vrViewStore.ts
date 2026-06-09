import { create } from 'zustand';

/** Hàng đợi xoay ngang (rad) — VR dùng XROrigin, desktop xoay camera */
export const SNAP_TURN_RAD = Math.PI / 4;

interface VrViewState {
  yawQueue: number;
  queueYaw: (radians: number) => void;
  takeYaw: () => number;
}

export const useVrViewStore = create<VrViewState>((set, get) => ({
  yawQueue: 0,
  queueYaw: (radians) => set({ yawQueue: get().yawQueue + radians }),
  takeYaw: () => {
    const yaw = get().yawQueue;
    if (yaw !== 0) set({ yawQueue: 0 });
    return yaw;
  },
}));

export function snapTurnLeft() {
  useVrViewStore.getState().queueYaw(SNAP_TURN_RAD);
}

export function snapTurnRight() {
  useVrViewStore.getState().queueYaw(-SNAP_TURN_RAD);
}
