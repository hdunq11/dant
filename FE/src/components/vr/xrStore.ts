import { createXRStore } from '@react-three/xr';

/** Tắt emulator — tránh lỗi pointer.getIntersection với webxr-polyfill */
export const xrStore = createXRStore({
  emulate: false,
  offerSession: false,
});
