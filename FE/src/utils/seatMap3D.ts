import type { SeatMapSeat, SeatMapZone } from '../types';

/** Tâm sân khấu trong model Sketchfab venue_stage_1 */
export const STAGE_CENTER: [number, number, number] = [0, 0.45, -3.2];
export const STAGE_SIZE: [number, number, number] = [18, 2.5, 7];

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
export function mapZonesTo3D(zones: SeatMapZone[]): Seat3D[] {
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
    let position: [number, number, number];

    if (isGltfSeatCoords(seat)) {
      position = [seat.pos_x!, seat.pos_z!, seat.pos_y!];
    } else if (usesGltf) {
      const nx = (coord.x - minX) / spanX;
      const ny = (coord.y - minY) / spanY;
      position = [(nx - 0.5) * arenaW, 0.35 + zoneIndex * 0.08, 4 + ny * arenaD];
    } else {
      const nx = (coord.x - minX) / spanX;
      const ny = (coord.y - minY) / spanY;
      position = [(nx - 0.5) * arenaW, 0.35 + zoneIndex * 0.08, 4 + ny * arenaD];
    }

    seats.push({
      seatId: seat.seat_id!,
      row: seat.row ?? '',
      number: seat.number ?? 0,
      status: seat.status,
      zoneId: zone.zone_id!,
      zoneName: zone.name ?? `Khu ${zoneIndex + 1}`,
      price: zone.price ?? 0,
      color: zone.color ?? ZONE_COLORS[zoneIndex % ZONE_COLORS.length],
      position,
    });
  }

  return seats;
}

export function seatViewPosition(seat: Seat3D): [number, number, number] {
  return [seat.position[0], seat.position[1] + 0.75, seat.position[2]];
}
