import type { SeatMapZone } from '../types';
import type { OrganizerStageOption } from '../constants/organizerStageCatalog';
import {
  seatPos2D,
  VENUE_DEFAULT_ROWS,
  VENUE_ROW_COUNT,
  VENUE_SEATS_PER_ROW,
} from './seatGrid';
import {
  stage1SeatPos2D,
  STAGE1_ROW_COUNT,
  STAGE1_SEATS_PER_ROW,
} from './stage1SeatGrid';

const ORGANIZER_SEAT_COLOR = '#64748b';

function buildFlatZone(
  prefix: string,
  rowLabels: string[],
  seatsPerRow: number,
  posFn: (rowIdx: number, seatNum: number) => { x: number; y: number }
): SeatMapZone[] {
  const seats = rowLabels.flatMap((row) => {
    const rowIdx = row.charCodeAt(0) - 65;
    return Array.from({ length: seatsPerRow }, (_, i) => {
      const number = i + 1;
      const { x, y } = posFn(rowIdx, number);
      return {
        seat_id: `${prefix}-${row}-${number}`,
        row,
        number,
        status: 'available',
        pos_x: x,
        pos_y: y,
        pos_z: 0,
        selectable: true,
      };
    });
  });

  return [
    {
      zone_id: `${prefix}-all`,
      name: 'Khán đài',
      price: 0,
      color: ORGANIZER_SEAT_COLOR,
      seats,
    },
  ];
}

/** Sơ đồ ghế mẫu organizer — một khối ghế, không chia zone/giá. */
export function buildOrganizerSchematicZones(option: OrganizerStageOption): SeatMapZone[] {
  if (option.id === 'auditorium') {
    const rows = VENUE_DEFAULT_ROWS.split(',').slice(0, VENUE_ROW_COUNT);
    return buildFlatZone(option.id, rows, VENUE_SEATS_PER_ROW, seatPos2D);
  }
  return buildFlatZone(
    option.id,
    Array.from({ length: STAGE1_ROW_COUNT }, (_, i) => String.fromCharCode(65 + i)),
    STAGE1_SEATS_PER_ROW,
    stage1SeatPos2D
  );
}

export const ORGANIZER_UNIFIED_SEAT_COLOR = ORGANIZER_SEAT_COLOR;
