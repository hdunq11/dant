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

const CANVAS_W = 720;
const STAGE_GAP = 48;
const ZONE_GAP = 20;
const MARGIN_X = 40;

export interface LayoutSeat {
  seatId: string;
  row: string;
  number: number;
  status?: string;
  selectable?: boolean;
  reservedByMe?: boolean;
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
      selectable: seat.selectable ?? (seat.status !== 'sold' && seat.status !== 'reserved'),
      reservedByMe: seat.reserved_by_me,
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

function stackZonesVertically(zones: SeatMapZone[]): ZoneLayout[] {
  const maxZoneW = CANVAS_W - MARGIN_X * 2;
  let y = STAGE_GAP;
  const zoneLayouts: ZoneLayout[] = [];

  for (let i = 0; i < zones.length; i++) {
    const layout = layoutOneZone(
      zones[i],
      { cx: CANVAS_W / 2, cy: y + 60, maxW: maxZoneW, maxH: 160, rotate: 0 },
      i
    );
    if (!layout) continue;

    const x = (CANVAS_W - layout.width) / 2;
    const dx = x - layout.x;
    const dy = y - layout.y;

    zoneLayouts.push({
      ...layout,
      x,
      y,
      rotate: 0,
      seats: layout.seats.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy })),
    });

    y += layout.height + ZONE_GAP;
  }

  return zoneLayouts;
}

export function layoutSeatMapZones(zones: SeatMapZone[]): {
  zoneLayouts: ZoneLayout[];
  canvasW: number;
  canvasH: number;
} {
  if (zones.length === 1) {
    const single = layoutOneZone(
      zones[0],
      { cx: CANVAS_W / 2, cy: 200, maxW: CANVAS_W - 80, maxH: 280, rotate: 0 },
      0
    );
    return { zoneLayouts: single ? [single] : [], canvasW: CANVAS_W, canvasH: 400 };
  }

  const zoneLayouts = stackZonesVertically(zones);
  const canvasH = Math.max(
    zoneLayouts.reduce((h, z) => Math.max(h, z.y + z.height), 0) + 24,
    400
  );

  return { zoneLayouts, canvasW: CANVAS_W, canvasH };
}
