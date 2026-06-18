import type { SeatMapZone } from '../types';
import { isGltfSeatCoords, type Seat3D, type VrFraming, type VrSpawn } from './seatMap3D';
import { stage1GlobalSeatNumber } from './stage1SeatGrid';

/** Ghế khán giả thật — loại nhãn lọt trên sân khấu (pos_y/depth từ import). */
export const STAGE1_MIN_AUDIENCE_DEPTH = 14.0;
export const STAGE1_MAX_SEAT_HEIGHT = 1.1;

/** Sân khấu stage_1 — phía trước khán đài (Z nhỏ ~16, không dùng hệ tọa độ venue_stage_1). */
const STAGE_CENTER: [number, number, number] = [0, 1.0, 16.5];
const STAGE_LOOK_AT: [number, number, number] = [0, 1.2, 16.5];

const STAGE1_TAG_TOP_OFFSET = 0.028;
export const STAGE1_TAG_PLANE_W = 0.18;
export const STAGE1_TAG_PLANE_D = 0.12;

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  return Math.atan2(dx, -dz);
}

/** Map zones → Seat3D cho model stage_1 (chỉ ghế đã import GLTF). */
export function mapStage1ZonesTo3D(zones: SeatMapZone[]): Seat3D[] {
  const ZONE_COLORS = ['#5b4dff', '#ff6b6b', '#ffd700', '#4ecdc4', '#a78bfa', '#f97316'];
  const seats: Seat3D[] = [];

  zones.forEach((zone, zoneIndex) => {
    for (const seat of zone.seats ?? []) {
      if (!isGltfSeatCoords(seat)) continue;
      if (
        seat.pos_y != null &&
        (seat.pos_y < STAGE1_MIN_AUDIENCE_DEPTH || (seat.pos_z ?? 0) > STAGE1_MAX_SEAT_HEIGHT)
      ) {
        continue;
      }
      seats.push({
        seatId: seat.seat_id!,
        row: seat.row ?? '',
        number: seat.number ?? 0,
        status: seat.status,
        selectable: seat.selectable ?? (seat.status !== 'sold' && seat.status !== 'reserved'),
        reservedByMe: seat.reserved_by_me,
        zoneId: zone.zone_id!,
        zoneName: zone.name ?? `Khu ${zoneIndex + 1}`,
        price: zone.price ?? 0,
        color: zone.color ?? ZONE_COLORS[zoneIndex % ZONE_COLORS.length],
        position: [seat.pos_x!, seat.pos_z!, seat.pos_y!],
      });
    }
  });

  return seats;
}

export function countStage1GltfSeats(zones: SeatMapZone[]): number {
  return zones.reduce(
    (n, z) => n + (z.seats?.filter((s) => isGltfSeatCoords(s)).length ?? 0),
    0
  );
}

export interface Stage1RowMetrics {
  heights: Map<string, number>;
  depths: Map<string, number>;
}

/** Đồng bộ cao/độ sâu theo hàng — import mesh có outlier thấp (~0.5) lẫn nệm (~0.79). */
export function buildStage1RowMetrics(seats: Seat3D[]): Stage1RowMetrics {
  const heightBuckets = new Map<string, number[]>();
  const depthBuckets = new Map<string, number[]>();

  for (const seat of seats) {
    const row = seat.row?.trim().toUpperCase() ?? '';
    if (!row) continue;
    const [, sy, sz] = seat.position;
    const heights = heightBuckets.get(row) ?? [];
    heights.push(sy);
    heightBuckets.set(row, heights);
    const depths = depthBuckets.get(row) ?? [];
    depths.push(sz);
    depthBuckets.set(row, depths);
  }

  const heights = new Map<string, number>();
  const depths = new Map<string, number>();

  for (const [row, values] of heightBuckets) {
    heights.set(row, Math.max(...values));
  }
  for (const [row, values] of depthBuckets) {
    values.sort((a, b) => a - b);
    depths.set(row, values[Math.floor(values.length / 2)]);
  }

  return { heights, depths };
}

/** @deprecated Dùng buildStage1RowMetrics */
export function buildStage1RowHeightMap(seats: Seat3D[]): Map<string, number> {
  return buildStage1RowMetrics(seats).heights;
}

/** Vị trí tấm biển — nằm ngang giữa nệm, cùng cao & cùng độ sâu trong hàng. */
export function stage1SeatTagPose(
  seat: Seat3D,
  rowMetrics?: Stage1RowMetrics,
): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const [sx, sy, sz] = seat.position;
  const row = seat.row?.trim().toUpperCase() ?? '';
  const rowY = rowMetrics?.heights.get(row) ?? sy;
  const rowZ = rowMetrics?.depths.get(row) ?? sz;

  return {
    position: [sx, rowY + STAGE1_TAG_TOP_OFFSET, rowZ],
    rotation: [-Math.PI / 2, 0, 0],
  };
}

export function stage1SeatLabel(seat: Seat3D): string {
  const global = stage1GlobalSeatNumber(seat.row, seat.number);
  if (global != null) return String(global);
  const row = seat.row?.trim().toUpperCase();
  const num = seat.number;
  if (row && num) return `${row}${num}`;
  if (row) return row;
  if (num) return String(num);
  return '?';
}

export function computeStage1VrSpawn(seats: Seat3D[]): VrSpawn {
  const stage = STAGE_CENTER;

  if (!seats.length) {
    const position: [number, number, number] = [0, 0, 42];
    return {
      position,
      rotationY: yawToward(position[0], position[2], stage[0], stage[2]),
      floorCenter: [0, 0, 20],
      floorW: 40,
      floorD: 50,
      floorY: 0,
    };
  }

  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const seat of seats) {
    const [x, , z] = seat.position;
    minX = Math.min(minX, x);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxZ = Math.max(maxZ, z);
  }

  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const width = Math.max(maxX - minX, 12);
  const depth = Math.max(maxZ - minZ, 12);
  const spawnZ = maxZ + Math.max(depth * 0.15, 3);
  const position: [number, number, number] = [cx, 0, spawnZ];

  return {
    position,
    rotationY: yawToward(position[0], position[2], stage[0], stage[2]),
    floorCenter: [cx, 0, cz],
    floorW: width + 10,
    floorD: depth + 14,
    floorY: 0,
  };
}

export function computeStage1VrFraming(seats: Seat3D[]): VrFraming {
  if (!seats.length) {
    return {
      position: [0, 14, 48],
      target: STAGE_CENTER,
      fogNear: 35,
      fogFar: 100,
      maxDistance: 55,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const seat of seats) {
    const [x, y, z] = seat.position;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const target: [number, number, number] = [
    cx * 0.3 + STAGE_CENTER[0] * 0.7,
    cy * 0.35 + STAGE_CENTER[1] * 0.65,
    (cz + STAGE_CENTER[2]) / 2,
  ];
  const spanZ = Math.max(maxZ - minZ, 6);
  const camZ = maxZ + Math.max(spanZ * 0.35, 10);
  const camY = Math.max(cy + 8, 10);

  return {
    position: [cx, camY, camZ],
    target,
    fogNear: 40,
    fogFar: camZ + 60,
    maxDistance: Math.max(camZ + 18, 50),
  };
}

export function stage1SeatViewPosition(seat: Seat3D): [number, number, number] {
  return [seat.position[0], seat.position[1] + 0.7, seat.position[2]];
}

export { STAGE_CENTER as STAGE1_STAGE_CENTER, STAGE_LOOK_AT as STAGE1_STAGE_LOOK_AT };
