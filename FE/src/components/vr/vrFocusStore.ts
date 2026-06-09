import { create } from 'zustand';
import type { Seat3D } from '../../utils/seatMap3D';

interface VrFocusState {
  focusSeat: Seat3D | null;
  setFocusSeat: (seat: Seat3D | null) => void;
  clearFocus: () => void;
  exitSeatSelect: (() => void) | null;
  setExitSeatSelect: (handler: (() => void) | null) => void;
}

export const useVrFocusStore = create<VrFocusState>((set) => ({
  focusSeat: null,
  setFocusSeat: (seat) => set({ focusSeat: seat }),
  clearFocus: () => set({ focusSeat: null }),
  exitSeatSelect: null,
  setExitSeatSelect: (handler) => set({ exitSeatSelect: handler }),
}));
