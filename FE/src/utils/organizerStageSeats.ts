import type { OrganizerStageOption } from '../constants/organizerStageCatalog';
import { buildOrganizerSchematicZones, ORGANIZER_UNIFIED_SEAT_COLOR } from './organizerStageSchematic';
import { applyOrganizerGltfCoords } from './organizerStageGltfCoords';
import { mapZonesTo3D, type Seat3D } from './seatMap3D';
import { mapStage1ZonesTo3D } from './seatMap3DStage1';

/** Ghế 3D organizer — dùng tọa độ GLTF giống concert 91 (auditorium) / 76 (stage1). */
export function buildOrganizerSeats3D(option: OrganizerStageOption): Seat3D[] {
  const zones = applyOrganizerGltfCoords(buildOrganizerSchematicZones(option), option.id);
  const seats =
    option.id === 'stage1'
      ? mapStage1ZonesTo3D(zones)
      : mapZonesTo3D(zones, { onlyGltfCoords: true });

  return seats.map((s) => ({
    ...s,
    color: ORGANIZER_UNIFIED_SEAT_COLOR,
    price: 0,
    zoneName: 'Khán đài',
  }));
}
