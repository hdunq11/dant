import type { SeatMapSeat, SeatMapZone } from '../types';
import { isGltfSeatCoords } from './seatMap3D';

const SEAT_STEP = 22;
const PAD = 10;

interface Slot {
  cx: number;
  cy: number;
  maxW: number;
  maxH: number;
  rotate: number;
}

/** Vị trí các khu quanh sân khấu (giống layout tham chiếu) */
const STADIUM_SLOTS: Slot[] = [
  { cx: 360, cy: 165, maxW: 280, maxH: 140, rotate: 0 },
  { cx: 360, cy: 320, maxW: 220, maxH: 95, rotate: 0 },
  { cx: 125, cy: 150, maxW: 170, maxH: 115, rotate: -22 },
  { cx: 595, cy: 150, maxW: 170, maxH: 115, rotate: 22 },
  { cx: 105, cy: 330, maxW: 150, maxH: 95, rotate: -16 },
  { cx: 615, cy: 330, maxW: 150, maxH: 95, rotate: 16 },
];

export interface LayoutSeat {
  seatId: string;
  row: string;
  number: number;
  status?: string;
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
}

function seatCoord(seat: SeatMapSeat, index: number, rowIndex: number) {
  // Sau import GLTF, pos_x/pos_y là tọa độ 3D — dùng lưới row/number cho sơ đồ 2D
  if (!isGltfSeatCoords(seat) && seat.pos_x != null && seat.pos_y != null) {
    return { x: seat.pos_x, y: seat.pos_y };
  }
  return { x: (seat.number ?? index + 1) * 10, y: rowIndex * 10 };
}

function layoutOneZone(zone: SeatMapZone, slot: Slot, index: number): ZoneLayout | null {
  const rawSeats = zone.seats ?? [];
  if (!rawSeats.length) return null;

  const rowIndex = new Map<string, number>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const coords = rawSeats.map((seat, i) => {
    const row = seat.row ?? 'A';
    if (!rowIndex.has(row)) rowIndex.set(row, rowIndex.size);
    const c = seatCoord(seat, i, rowIndex.get(row)!);
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
    return c;
  });

  const rawW = Math.max(maxX - minX, 10) + SEAT_STEP;
  const rawH = Math.max(maxY - minY, 10) + SEAT_STEP;
  const scale = Math.min(slot.maxW / rawW, slot.maxH / rawH, 1.35);
  const blockW = rawW * scale;
  const blockH = rawH * scale;
  const originX = slot.cx - blockW / 2;
  const originY = slot.cy - blockH / 2;

  const seats: LayoutSeat[] = rawSeats.map((seat, i) => {
    const c = coords[i];
    return {
      seatId: seat.seat_id!,
      row: seat.row ?? '',
      number: seat.number ?? 0,
      status: seat.status,
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
    rotate: slot.rotate,
    seats,
  };
}

export function layoutSeatMapZones(zones: SeatMapZone[]): {
  zoneLayouts: ZoneLayout[];
  canvasW: number;
  canvasH: number;
} {
  const canvasW = 720;
  const canvasH = 400;

  if (zones.length === 1) {
    const single = layoutOneZone(zones[0], { cx: 360, cy: 200, maxW: 420, maxH: 220, rotate: 0 }, 0);
    return { zoneLayouts: single ? [single] : [], canvasW, canvasH };
  }

  const zoneLayouts = zones
    .map((zone, i) => layoutOneZone(zone, STADIUM_SLOTS[i % STADIUM_SLOTS.length], i))
    .filter(Boolean) as ZoneLayout[];

  return { zoneLayouts, canvasW, canvasH };
}
