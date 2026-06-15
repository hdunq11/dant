/** Lưới hội trường: 12 hàng × 28 ghế (14 trái + lối đi + 14 phải) */
export const VENUE_ROW_COUNT = 12;
export const VENUE_SEATS_PER_SIDE = 14;
export const VENUE_AISLE_AFTER = 14;
export const VENUE_SEATS_PER_ROW = VENUE_SEATS_PER_SIDE * 2;
export const VENUE_AISLE_GAP_2D = 30;

export const VENUE_DEFAULT_ROWS = Array.from({ length: VENUE_ROW_COUNT }, (_, i) =>
  String.fromCharCode(65 + i)
).join(',');

export function seatPos2D(rowIndex: number, seatNumber: number, step = 10): { x: number; y: number } {
  const x =
    seatNumber <= VENUE_AISLE_AFTER
      ? seatNumber * step
      : VENUE_AISLE_AFTER * step + VENUE_AISLE_GAP_2D + (seatNumber - VENUE_AISLE_AFTER) * step;
  return { x, y: rowIndex * step };
}

/** Số ghế liên tục 1..336 — hàng A ghế 1 = 1, B1 = 29, B14 = 42, ... */
export function globalSeatNumber(row: string, seatNumber: number): number | null {
  const r = row?.trim().toUpperCase();
  if (!r || r.length !== 1 || r < 'A' || r > 'L' || seatNumber < 1 || seatNumber > VENUE_SEATS_PER_ROW) {
    return null;
  }
  return (r.charCodeAt(0) - 65) * VENUE_SEATS_PER_ROW + seatNumber;
}
