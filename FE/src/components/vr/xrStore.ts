import { createXRStore } from '@react-three/xr';

/** Cấu hình tối giản cho Quest Browser — tránh feature WebXR gây màn hình đen */
export const xrStore = createXRStore({
  emulate: "metaQuest3",
  offerSession: false,
});
