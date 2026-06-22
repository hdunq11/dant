/** stage_1: 2 khối × 500 ghế (20 hàng × 25 cột), lối đi giữa — đánh số 1–500 | 501–1000 */

export const STAGE1_ROW_COUNT = 20;

export const STAGE1_SEATS_PER_SIDE = 25;

export const STAGE1_AISLE_AFTER = 25;

export const STAGE1_SEATS_PER_ROW = STAGE1_SEATS_PER_SIDE * 2;

export const STAGE1_SEATS_PER_BLOCK = STAGE1_ROW_COUNT * STAGE1_SEATS_PER_SIDE;

export const STAGE1_TOTAL_SEATS = STAGE1_SEATS_PER_BLOCK * 2;

export const STAGE1_AISLE_GAP_2D = 40;



export const STAGE1_MODEL_PATH = 'models/stage_1/scene.gltf';

/** Chỉ model stage_1 — KHÔNG khớp venue_stage_1 (substring stage_1 gây nhầm). */
export function isStage1VenueModel(path?: string | null): boolean {
  if (!path) return false;
  const normalized = path.replace(/\\/g, '/').replace(/^\//, '');
  return normalized === STAGE1_MODEL_PATH || /(?:^|\/)stage_1\/scene\.gltf$/i.test(normalized);
}



export function stage1RowLabelToIndex(rowLabel: string): number | null {

  const row = rowLabel?.trim().toUpperCase();

  if (!row || row.length !== 1 || row < 'A' || row > 'T') return null;

  return row.charCodeAt(0) - 65;

}



export function stage1BlockSide(seatNumber: number): 'left' | 'right' | null {

  if (seatNumber >= 1 && seatNumber <= STAGE1_SEATS_PER_SIDE) return 'left';

  if (seatNumber > STAGE1_SEATS_PER_SIDE && seatNumber <= STAGE1_SEATS_PER_ROW) return 'right';

  return null;

}



export function stage1BlockColumn(seatNumber: number): number | null {

  const side = stage1BlockSide(seatNumber);

  if (side === 'left') return seatNumber;

  if (side === 'right') return seatNumber - STAGE1_SEATS_PER_SIDE;

  return null;

}



/** Số ghế liên tục 1–1000 (khối trái 1–500, khối phải 501–1000). */

export function stage1GlobalSeatNumber(row: string, seatNumber: number): number | null {

  const idx = stage1RowLabelToIndex(row);

  const col = stage1BlockColumn(seatNumber);

  const side = stage1BlockSide(seatNumber);

  if (idx == null || col == null || !side) return null;

  if (side === 'left') return idx * STAGE1_SEATS_PER_SIDE + col;

  return STAGE1_SEATS_PER_BLOCK + idx * STAGE1_SEATS_PER_SIDE + col;

}



export function stage1SeatPos2D(rowIndex: number, seatNumber: number, step = 10): { x: number; y: number } {

  const col = stage1BlockColumn(seatNumber);

  const side = stage1BlockSide(seatNumber);

  if (col == null || !side) return { x: 0, y: rowIndex * step };



  const y = rowIndex * step;

  if (side === 'left') return { x: (col - 1) * step, y };

  const leftW = STAGE1_SEATS_PER_SIDE * step;

  return { x: leftW + STAGE1_AISLE_GAP_2D + (col - 1) * step, y };

}



export function isStage1Layout(zones: { seats?: { row?: string; number?: number }[] }[]): boolean {
  const rows = new Set<string>();
  let total = 0;
  for (const zone of zones) {
    for (const seat of zone.seats ?? []) {
      total += 1;
      const row = seat.row?.trim().toUpperCase();
      if (!row || stage1RowLabelToIndex(row) === null) return false;
      const num = seat.number ?? 0;
      if (num < 1 || num > STAGE1_SEATS_PER_ROW) return false;
      rows.add(row);
    }
  }
  if (total === 0 || total > STAGE1_TOTAL_SEATS) return false;
  const indices = [...rows].map((r) => stage1RowLabelToIndex(r)!);
  const maxIdx = Math.max(...indices);
  for (let i = 0; i <= maxIdx; i += 1) {
    if (!rows.has(String.fromCharCode(65 + i))) return false;
  }
  return true;
}

export function isStage1Auditorium(zones: { seats?: { row?: string; number?: number }[] }[]): boolean {
  return isStage1Layout(zones) && countStage1Seats(zones) === STAGE1_TOTAL_SEATS;
}

function countStage1Seats(zones: { seats?: { row?: string; number?: number }[] }[]): number {
  let total = 0;
  for (const zone of zones) {
    total += zone.seats?.length ?? 0;
  }
  return total;
}
