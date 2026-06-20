import type { SeatMapZone } from '../types';
import auditoriumData from '../../public/data/organizer/auditorium-seats.json';
import stage1Data from '../../public/data/organizer/stage1-seats.json';

export interface OrganizerGltfSeatCoord {
  row: string;
  number: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
}

function seatCoordKey(row: string, number: number): string {
  return `${row.trim().toUpperCase()}:${number}`;
}

function buildCoordMap(seats: OrganizerGltfSeatCoord[]): Map<string, OrganizerGltfSeatCoord> {
  const map = new Map<string, OrganizerGltfSeatCoord>();
  for (const seat of seats) {
    map.set(seatCoordKey(seat.row, seat.number), seat);
  }
  return map;
}

const GLTF_COORDS: Record<'auditorium' | 'stage1', Map<string, OrganizerGltfSeatCoord>> = {
  auditorium: buildCoordMap(auditoriumData.seats as OrganizerGltfSeatCoord[]),
  stage1: buildCoordMap(stage1Data.seats as OrganizerGltfSeatCoord[]),
};

/** Gắn tọa độ GLTF (cùng nguồn import concert 91/76) vào sơ đồ organizer. */
export function applyOrganizerGltfCoords(
  zones: SeatMapZone[],
  optionId: 'auditorium' | 'stage1'
): SeatMapZone[] {
  const map = GLTF_COORDS[optionId];
  return zones.map((zone) => ({
    ...zone,
    seats: zone.seats?.map((seat) => {
      const coord = map.get(seatCoordKey(seat.row ?? 'A', seat.number ?? 0));
      if (!coord) return seat;
      return {
        ...seat,
        pos_x: coord.pos_x,
        pos_y: coord.pos_y,
        pos_z: coord.pos_z,
      };
    }),
  }));
}

export function countOrganizerGltfCoords(optionId: 'auditorium' | 'stage1'): number {
  return GLTF_COORDS[optionId].size;
}
