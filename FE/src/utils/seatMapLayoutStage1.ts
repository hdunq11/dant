import type { SeatMapZone } from '../types';
import {
  STAGE1_AISLE_GAP_2D,
  STAGE1_ROW_COUNT,
  STAGE1_SEATS_PER_SIDE,
  STAGE1_TOTAL_SEATS,
  isStage1Auditorium,
  stage1BlockColumn,
  stage1GlobalSeatNumber,
  stage1RowLabelToIndex,
} from './stage1SeatGrid';

/** Khớp .arena-seat (22×22px) */
const SEAT_SIZE = 22;
const SEAT_STEP = SEAT_SIZE;
const STAGE_GAP = 48;

export interface Stage1LayoutSeat {
  seatId: string;
  row: string;
  number: number;
  globalNumber: number | null;
  zoneId: string;
  zoneName: string;
  price: number;
  status?: string;
  selectable?: boolean;
  reservedByMe?: boolean;
  x: number;
  y: number;
}

export interface Stage1ZoneLayout {
  zoneId: string;
  zoneName: string;
  price: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  seats: Stage1LayoutSeat[];
  auditorium?: boolean;
}

function localCell(rowIdx: number, col: number): { x: number; y: number } {
  return { x: (col - 1) * SEAT_STEP, y: rowIdx * SEAT_STEP };
}

/** Sơ đồ 2D: khối trái 20×25 (1–500) | lối đi | khối phải 20×25 (501–1000). */
export function layoutStage1SeatMapZones(zones: SeatMapZone[]): {
  zoneLayouts: Stage1ZoneLayout[];
  canvasW: number;
  canvasH: number;
  stageWidth: number;
} {
  if (!isStage1Auditorium(zones)) {
    return { zoneLayouts: [], canvasW: 720, canvasH: 400, stageWidth: 320 };
  }

  const blockW = STAGE1_SEATS_PER_SIDE * SEAT_STEP;
  const blockH = STAGE1_ROW_COUNT * SEAT_STEP;
  const totalW = blockW * 2 + STAGE1_AISLE_GAP_2D;
  const canvasW = Math.max(totalW + 48, 720);
  const originX = (canvasW - totalW) / 2;
  const originY = STAGE_GAP + 36;

  const leftSeats: Stage1LayoutSeat[] = [];
  const rightSeats: Stage1LayoutSeat[] = [];

  for (const zone of zones) {
    for (const seat of zone.seats ?? []) {
      const row = (seat.row ?? 'A').trim().toUpperCase();
      const num = seat.number ?? 0;
      const rowIdx = stage1RowLabelToIndex(row) ?? 0;
      const col = stage1BlockColumn(num);
      if (col == null) continue;

      const isLeft = num <= STAGE1_SEATS_PER_SIDE;
      const cell = localCell(rowIdx, col);
      const blockX = isLeft ? originX : originX + blockW + STAGE1_AISLE_GAP_2D;

      const item: Stage1LayoutSeat = {
        seatId: seat.seat_id!,
        row,
        number: num,
        globalNumber: stage1GlobalSeatNumber(row, num),
        zoneId: zone.zone_id!,
        zoneName: zone.name ?? '',
        price: zone.price ?? 0,
        status: seat.status,
        selectable: seat.selectable ?? (seat.status !== 'sold' && seat.status !== 'reserved'),
        reservedByMe: seat.reserved_by_me,
        x: blockX + cell.x,
        y: originY + cell.y,
      };

      if (isLeft) leftSeats.push(item);
      else rightSeats.push(item);
    }
  }

  const zoneLayouts: Stage1ZoneLayout[] = [
    {
      zoneId: 'stage1-left',
      zoneName: 'Khối trái (1–500)',
      price: 0,
      x: originX,
      y: originY,
      width: blockW,
      height: blockH,
      rotate: 0,
      auditorium: true,
      seats: leftSeats,
    },
    {
      zoneId: 'stage1-right',
      zoneName: 'Khối phải (501–1000)',
      price: 0,
      x: originX + blockW + STAGE1_AISLE_GAP_2D,
      y: originY,
      width: blockW,
      height: blockH,
      rotate: 0,
      auditorium: true,
      seats: rightSeats,
    },
  ];

  return {
    zoneLayouts,
    canvasW,
    canvasH: Math.max(originY + blockH + 24, 480),
    stageWidth: totalW,
  };
}

export { STAGE1_TOTAL_SEATS };
