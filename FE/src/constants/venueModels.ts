/** Model 3D sân khấu / hội trường — file nằm trong FE/public/ */
export interface VenueModelOption {
  id: string;
  label: string;
  /** Đường dẫn lưu DB (không có dấu / đầu) */
  path: string;
  /** Có mesh ghế Sketchfab (seat_seat_0) — chạy import_seats_from_gltf được */
  hasSeatMesh: boolean;
  description: string;
}

export const VENUE_MODEL_OPTIONS: VenueModelOption[] = [
  {
    id: 'stage_1',
    label: 'Sân khấu 1 (stage_1)',
    path: 'models/stage_1/scene.gltf',
    hasSeatMesh: false,
    description: 'Hội trường virtual fair — ghế nhìn thấy 3D, chưa map từng ghế đặt vé.',
  },
  {
    id: 'venue_stage_1',
    label: 'Hội trường có ghế (venue_stage_1)',
    path: 'models/venue_stage_1/scene.gltf',
    hasSeatMesh: true,
    description: 'Hội trường đầy đủ ghế — dùng cho concert đã import tọa độ GLTF.',
  },
  {
    id: 'stage_2',
    label: 'Sân khấu 2',
    path: 'models/stage_2/scene.gltf',
    hasSeatMesh: false,
    description: 'Chỉ khung sân khấu — ghế VR hiển thị lưới 2D (chưa có mesh ghế).',
  },
  {
    id: 'stage_3',
    label: 'Sân khấu 3',
    path: 'models/stage_3/scene.gltf',
    hasSeatMesh: false,
    description: 'Chỉ khung sân khấu — ghế VR hiển thị lưới 2D.',
  },
  {
    id: 'stage_4',
    label: 'Sân khấu 4',
    path: 'models/stage_4/scene.gltf',
    hasSeatMesh: false,
    description: 'Chỉ khung sân khấu — ghế VR hiển thị lưới 2D.',
  },
];

export function venueModelLabel(path?: string | null): string {
  if (!path) return 'Chưa cấu hình';
  const found = VENUE_MODEL_OPTIONS.find((m) => m.path === path);
  return found?.label ?? path;
}

export function venueModelByPath(path?: string | null): VenueModelOption | undefined {
  if (!path) return undefined;
  return VENUE_MODEL_OPTIONS.find((m) => m.path === path);
}
