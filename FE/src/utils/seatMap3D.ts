import type { SeatMapSeat, SeatMapZone } from '../types';
import { rowLabelToIndex, VENUE_AISLE_AFTER, VENUE_SEATS_PER_ROW } from './seatGrid';
export const STAGE_CENTER: [number, number, number] = [0, 0.45, -3.2];
/** Điểm nhìn khi ngồi ghế — ngang tầm mắt, hướng sân khấu */
export const STAGE_LOOK_AT: [number, number, number] = [0, 1.1, -3.2];
export const STAGE_SIZE: [number, number, number] = [18, 2.5, 7];

/** Góc Y (rad) để mặt hướng về điểm đích; Three.js mặc định nhìn theo -Z */
export function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  return Math.atan2(dx, -dz);
}

/** Ghế đã import từ GLTF: pos_z > 0 → pos_x/pos_y là tọa độ 3D, không dùng cho sơ đồ 2D */
export function isGltfSeatCoords(seat: SeatMapSeat): boolean {
  return seat.pos_z != null && seat.pos_z > 0.05;
}

export interface VrFraming {
  position: [number, number, number];
  target: [number, number, number];
  fogNear: number;
  fogFar: number;
  maxDistance: number;
}

/** Vị trí chân + sàn teleport khi vào VR (nhìn về phía sân khấu) */
export interface VrSpawn {
  position: [number, number, number];
  rotationY: number;
  floorCenter: [number, number, number];
  floorW: number;
  floorD: number;
  floorY: number;
}

export function computeVrSpawn(seats: Seat3D[], hasVenueModel: boolean): VrSpawn {
  const stage = STAGE_CENTER;

  if (!seats.length) {
    const position: [number, number, number] = hasVenueModel ? [0, 0, 10] : [0, 0, 14];
    return {
      position,
      rotationY: yawToward(position[0], position[2], stage[0], stage[2]),
      floorCenter: [0, 0, 5],
      floorW: 36,
      floorD: 36,
      floorY: 0,
    };
  }

  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  let minY = Infinity;

  for (const seat of seats) {
    const [x, y, z] = seat.position;
    minX = Math.min(minX, x);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxZ = Math.max(maxZ, z);
    minY = Math.min(minY, y);
  }

  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const width = Math.max(maxX - minX, 8);
  const depth = Math.max(maxZ - minZ, 8);
  const groundY = hasVenueModel ? Math.max(minY - 0.45, 0) : Math.max(minY - 0.4, 0);

  // Đặt người xem phía sau khán đài (xa sân khấu), tầm mắt khán giả nhìn lên sân khấu
  const stageZ = stage[2];
  const audienceSign = cz >= stageZ ? 1 : -1;
  const audienceEdgeZ = audienceSign > 0 ? maxZ : minZ;
  const spawnZ = audienceEdgeZ + audienceSign * Math.max(depth * 0.12, 1.5);
  const position: [number, number, number] = [cx, groundY, spawnZ];

  return {
    position,
    rotationY: yawToward(position[0], position[2], STAGE_LOOK_AT[0], STAGE_LOOK_AT[2]),
    floorCenter: [cx, groundY, cz],
    floorW: width + 12,
    floorD: depth + 16,
    floorY: groundY,
  };
}

/** Căn camera / orbit theo vùng ghế + sân khấu (sau khi import GLTF) */
export function computeVrFraming(seats: Seat3D[], hasVenueModel: boolean): VrFraming {
  if (!seats.length) {
    return {
      position: [0, 10, 26],
      target: STAGE_CENTER,
      fogNear: 30,
      fogFar: 90,
      maxDistance: 45,
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

  const target: [number, number, number] = hasVenueModel
    ? [cx * 0.35 + STAGE_CENTER[0] * 0.65, cy * 0.4 + STAGE_CENTER[1] * 0.6, (cz + STAGE_CENTER[2]) / 2]
    : STAGE_CENTER;

  const spanZ = Math.max(maxZ - minZ, 4);
  const camZ = maxZ + Math.max(spanZ * 0.45, 8);
  const camY = Math.max(cy + 7, 9);

  return {
    position: [cx, camY, camZ],
    target,
    fogNear: 35,
    fogFar: camZ + 55,
    maxDistance: Math.max(camZ + 15, 45),
  };
}

export interface Seat3D {
  seatId: string;
  row: string;
  number: number;
  status?: string;
  selectable?: boolean;
  reservedByMe?: boolean;
  zoneId: string;
  zoneName: string;
  price: number;
  color: string;
  position: [number, number, number];
}

const ZONE_COLORS = ['#5b4dff', '#ff6b6b', '#ffd700', '#4ecdc4', '#a78bfa', '#f97316'];

function seatCoord2D(seat: NonNullable<SeatMapZone['seats']>[number], index: number, rowIndex: number) {
  if (!isGltfSeatCoords(seat) && seat.pos_x != null && seat.pos_y != null) {
    return { x: seat.pos_x, y: seat.pos_y };
  }
  return { x: (seat.number ?? index + 1) * 10, y: rowIndex * 10 };
}

/** Chuyển tọa độ API sang không gian 3D. Nếu có pos_z (từ GLTF) dùng trực tiếp. */
export interface MapZonesTo3DOptions {
  /** Chỉ lấy ghế đã import tọa độ 3D từ GLTF — bỏ lưới 2D giả khi có model venue */
  onlyGltfCoords?: boolean;
}

function dedupeSeatsByPosition(seats: Seat3D[]): Seat3D[] {
  const seen = new Set<string>();
  const out: Seat3D[] = [];
  for (const seat of seats) {
    const [x, , z] = seat.position;
    const key = `${x.toFixed(2)}|${z.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(seat);
  }
  return out;
}

export function mapZonesTo3D(zones: SeatMapZone[], options?: MapZonesTo3DOptions): Seat3D[] {
  const onlyGltf = options?.onlyGltfCoords ?? false;
  const seats: Seat3D[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const raw = zones.flatMap((zone, zoneIndex) => {
    const rowIndex = new Map<string, number>();
    return (zone.seats ?? []).map((seat, i) => {
      const row = seat.row ?? 'A';
      if (!rowIndex.has(row)) rowIndex.set(row, rowIndex.size);
      const c = seatCoord2D(seat, i, rowIndex.get(row)!);
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
      return { seat, zone, zoneIndex, coord: c };
    });
  });

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const arenaW = 22;
  const arenaD = 16;
  const usesGltf = raw.some((item) => isGltfSeatCoords(item.seat));

  for (const item of raw) {
    const { seat, zone, zoneIndex, coord } = item;

    if (onlyGltf && !isGltfSeatCoords(seat)) {
      continue;
    }

    let position: [number, number, number];

    if (isGltfSeatCoords(seat)) {
      position = [seat.pos_x!, seat.pos_z!, seat.pos_y!];
    } else if (usesGltf && !onlyGltf) {
      const nx = (coord.x - minX) / spanX;
      const ny = (coord.y - minY) / spanY;
      position = [(nx - 0.5) * arenaW, 0.35 + zoneIndex * 0.08, 4 + ny * arenaD];
    } else if (!onlyGltf) {
      const nx = (coord.x - minX) / spanX;
      const ny = (coord.y - minY) / spanY;
      position = [(nx - 0.5) * arenaW, 0.35 + zoneIndex * 0.08, 4 + ny * arenaD];
    } else {
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
      position,
    });
  }

  return options?.onlyGltfCoords ? dedupeSeatsByPosition(seats) : seats;
}

export function seatViewPosition(seat: Seat3D): [number, number, number] {
  return [seat.position[0], seat.position[1] + 0.75, seat.position[2]];
}

/** Nhãn ghế trên tấm bìa VR — hàng + số, ví dụ A1, A2, B14 */
export function seatLabel(seat: Seat3D): string {
  const row = seat.row?.trim().toUpperCase();
  const num = seat.number;
  if (row && num) return `${row}${num}`;
  if (row) return row;
  if (num) return String(num);
  return '?';
}

/** Căn tấm bìa vào giữa lưng ghế — khối trái dịch phải, khối phải dịch trái */
function seatLateralOffset(seatNumber: number): number {
  if (seatNumber < 1 || seatNumber > VENUE_SEATS_PER_ROW) return 0;
  const shift = 0.275;
  return seatNumber <= VENUE_AISLE_AFTER ? shift : -shift;
}

/** Vị trí + hướng tấm bìa dán sau lưng ghế (mặt phẳng hướng khán giả) */
export function seatTagPose(seat: Seat3D): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const [sx, sy, sz] = seat.position;
  const [, , stageZ] = STAGE_CENTER;
  const towardAudience = sz >= stageZ ? 1 : -1;

  const rowIndex = rowLabelToIndex(seat.row) ?? 0;
  // Hàng F–L trên bậc cao dần: tâm lưới lệch về phía sân khấu hơn so với mặt lưng ghế thật
  const tierRows = Math.max(0, rowIndex - 4);
  const upperTierRows = Math.max(0, rowIndex - 8); // hàng J–L (10–12)
  const backOffset = 0.26 + tierRows * 0.045 + upperTierRows * 0.05;
  const heightOffset = -0.3 + rowIndex * 0.022 - upperTierRows * 0.012;

  const lateralOffset = seatLateralOffset(seat.number);

  return {
    position: [sx + lateralOffset, sy + heightOffset, sz + towardAudience * backOffset],
    // Pháp tuyến +Z: mặt tấm hướng khán giả (phía sau lưng ghế)
    rotation: [0, 0, 0],
  };
}

export function countSeatsInZones(zones: SeatMapZone[]): number {
  return zones.reduce((n, z) => n + (z.seats?.length ?? 0), 0);
}

export function countGltfSeatsInZones(zones: SeatMapZone[]): number {
  return zones.reduce(
    (n, z) => n + (z.seats?.filter((s) => isGltfSeatCoords(s)).length ?? 0),
    0
  );
}

export function computeSeatOriginPose(
  seat: Seat3D,
  floorY = 0
): { position: [number, number, number]; rotationY: number } {
  const [sx, sy, sz] = seat.position;
  const look = STAGE_LOOK_AT;
  const feetY = Math.max(sy - 0.45, floorY);
  return {
    position: [sx, feetY, sz],
    rotationY: yawToward(sx, sz, look[0], look[2]),
  };
}
