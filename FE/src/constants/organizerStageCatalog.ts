/** Catalog sân khấu cho organizer — tách biệt fan/concert 91 & 76. */
export interface OrganizerStageOption {
  id: 'auditorium' | 'stage1';
  label: string;
  description: string;
  capacity: number;
  /** Đường dẫn public GLTF */
  modelPath: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    maxDistance: number;
  };
}

export const ORGANIZER_STAGE_OPTIONS: OrganizerStageOption[] = [
  {
    id: 'auditorium',
    label: 'Hội trường 336 ghế',
    description: 'Một khán đài trung tâm — layout 12×28 ghế.',
    capacity: 336,
    modelPath: '/models/venue_stage_1/scene.gltf',
    camera: {
      position: [0, 10, 26],
      target: [0, 1.0, 0],
      maxDistance: 45,
    },
  },
  {
    id: 'stage1',
    label: 'Sân khấu 1000 ghế',
    description: 'Hai khối khán giả — layout 1000 ghế, lối đi giữa.',
    capacity: 1000,
    modelPath: '/models/stage_1/scene.gltf',
    camera: {
      position: [0, 14, 34],
      target: [0, 1.0, 16.5],
      maxDistance: 58,
    },
  },
];

export function organizerStageById(id: string): OrganizerStageOption | undefined {
  return ORGANIZER_STAGE_OPTIONS.find((o) => o.id === id);
}
