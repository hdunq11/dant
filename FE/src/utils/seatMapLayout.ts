import type { SeatMapSeat, SeatMapZone } from '../types';
import { resolveZoneColor } from './zoneColors';
import { isGltfSeatCoords } from './seatMap3D';
import { globalSeatNumber, seatPos2D, VENUE_ROW_COUNT, VENUE_SEATS_PER_ROW } from './seatGrid';

const SEAT_STEP = 22;
const PAD = 10;

const CANVAS_W = 720;
const STAGE_GAP = 48;
const MARGIN_X = 40;

export interface LayoutSeat {
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
  zoneColor?: string;
  x: number;
  y: number;
}

export interface ZoneLayout {
  zoneId: string;
  zoneName: string;
  price: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  seats: LayoutSeat[];
  auditorium?: boolean;
}

function seatCoord(seat: SeatMapSeat, rowIdx: number) {
  if (!isGltfSeatCoords(seat) && seat.pos_x != null && seat.pos_y != null) {
    return { x: seat.pos_x, y: seat.pos_y };
  }
  const num = seat.number ?? 1;
  return seatPos2D(rowIdx, num);
}

function isFullAuditorium(zones: SeatMapZone[]): boolean {
  const rows = new Set<string>();
  let total = 0;
  for (const zone of zones) {
    for (const seat of zone.seats ?? []) {
      total += 1;
      const row = seat.row?.trim().toUpperCase();
      if (row) rows.add(row);
    }
  }
  return total === VENUE_ROW_COUNT * VENUE_SEATS_PER_ROW && rows.size === VENUE_ROW_COUNT;
}

/** Một khán đài 12×28 — ghép mọi zone vào đúng vị trí hàng A–L (giống bảng Excel). */
function layoutAuditorium(zones: SeatMapZone[]): { zoneLayouts: ZoneLayout[]; canvasW: number; canvasH: number } {
  const raw: Array<{
    seat: SeatMapSeat;
    zone: SeatMapZone;
    zoneIndex: number;
    coord: { x: number; y: number };
  }> = [];

  for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex++) {
    const zone = zones[zoneIndex];
    for (const seat of zone.seats ?? []) {
      const row = (seat.row ?? 'A').trim().toUpperCase();
      const global = globalSeatNumber(row, seat.number ?? 1);
      const rowIdx = global != null ? Math.floor((global - 1) / VENUE_SEATS_PER_ROW) : 0;
      raw.push({ seat, zone, zoneIndex, coord: seatCoord(seat, rowIdx) });
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of raw) {
    minX = Math.min(minX, item.coord.x);
    minY = Math.min(minY, item.coord.y);
    maxX = Math.max(maxX, item.coord.x);
    maxY = Math.max(maxY, item.coord.y);
  }

  const rawW = Math.max(maxX - minX, 10) + SEAT_STEP;
  const rawH = Math.max(maxY - minY, 10) + SEAT_STEP;
  const maxW = CANVAS_W - MARGIN_X * 2;
  const scale = Math.min(maxW / rawW, 320 / rawH, 1.35);
  const blockW = rawW * scale;
  const blockH = rawH * scale;
  const originX = (CANVAS_W - blockW) / 2;
  const originY = STAGE_GAP + 36;

  const seats: LayoutSeat[] = raw.map(({ seat, zone, zoneIndex, coord }) => {
    const row = seat.row ?? '';
    const num = seat.number ?? 0;
    return {
      seatId: seat.seat_id!,
      row,
      number: num,
      globalNumber: globalSeatNumber(row, num),
      zoneId: zone.zone_id!,
      zoneName: zone.name ?? '',
      price: zone.price ?? 0,
      status: seat.status,
      selectable: seat.selectable ?? (seat.status !== 'sold' && seat.status !== 'reserved'),
      reservedByMe: seat.reserved_by_me,
      zoneColor: resolveZoneColor(zone.color, zoneIndex),
      x: originX + (coord.x - minX) * scale,
      y: originY + (coord.y - minY) * scale,
    };
  });

  const layout: ZoneLayout = {
    zoneId: 'auditorium',
    zoneName: 'Khán đài',
    price: 0,
    x: originX - PAD,
    y: originY - PAD,
    width: blockW + PAD * 2,
    height: blockH + PAD * 2,
    rotate: 0,
    auditorium: true,
    seats,
  };

  return {
    zoneLayouts: [layout],
    canvasW: CANVAS_W,
    canvasH: Math.max(originY + blockH + PAD + 24, 400),
  };
}

function layoutOneZone(zone: SeatMapZone, index: number): ZoneLayout | null {
  const rawSeats = zone.seats ?? [];
  if (!rawSeats.length) return null;

  const rowIndex = new Map<string, number>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const coords = rawSeats.map((seat) => {
    const row = seat.row ?? 'A';
    if (!rowIndex.has(row)) rowIndex.set(row, rowIndex.size);
    const global = globalSeatNumber(row, seat.number ?? 1);
    const rowIdx = global != null ? Math.floor((global - 1) / VENUE_SEATS_PER_ROW) : rowIndex.get(row)!;
    const c = seatCoord(seat, rowIdx);
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
    return c;
  });

  const rawW = Math.max(maxX - minX, 10) + SEAT_STEP;
  const rawH = Math.max(maxY - minY, 10) + SEAT_STEP;
  const maxW = CANVAS_W - MARGIN_X * 2;
  const scale = Math.min(maxW / rawW, 160 / rawH, 1.35);
  const blockW = rawW * scale;
  const blockH = rawH * scale;
  const originX = (CANVAS_W - blockW) / 2;
  const originY = STAGE_GAP + index * (blockH + 20);

  const seats: LayoutSeat[] = rawSeats.map((seat, i) => {
    const row = seat.row ?? '';
    const num = seat.number ?? 0;
    const c = coords[i];
    return {
      seatId: seat.seat_id!,
      row,
      number: num,
      globalNumber: globalSeatNumber(row, num),
      zoneId: zone.zone_id!,
      zoneName: zone.name ?? '',
      price: zone.price ?? 0,
      status: seat.status,
      selectable: seat.selectable ?? (seat.status !== 'sold' && seat.status !== 'reserved'),
      reservedByMe: seat.reserved_by_me,
      zoneColor: resolveZoneColor(zone.color, index),
      x: originX + (c.x - minX) * scale,
      y: originY + (c.y - minY) * scale,
    };
  });

  return {
    zoneId: zone.zone_id!,
    zoneName: zone.name ?? `Khu ${index + 1}`,
    price: zone.price ?? 0,
    x: originX - PAD,
    y: originY - PAD,
    width: blockW + PAD * 2,
    height: blockH + PAD * 2,
    rotate: 0,
    seats,
  };
}

export function layoutSeatMapZones(zones: SeatMapZone[]): {
  zoneLayouts: ZoneLayout[];
  canvasW: number;
  canvasH: number;
} {
  if (isFullAuditorium(zones)) {
    return layoutAuditorium(zones);
  }

  const zoneLayouts: ZoneLayout[] = [];
  let y = STAGE_GAP;
  for (let i = 0; i < zones.length; i++) {
    const layout = layoutOneZone(zones[i], i);
    if (!layout) continue;
    const dy = y - layout.y;
    zoneLayouts.push({
      ...layout,
      y,
      seats: layout.seats.map((s) => ({ ...s, y: s.y + dy })),
    });
    y += layout.height + 20;
  }

  return {
    zoneLayouts,
    canvasW: CANVAS_W,
    canvasH: Math.max(y + 24, 400),
  };
}
