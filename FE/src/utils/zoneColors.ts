export const ZONE_COLOR_PALETTE = [
  '#5b4dff',
  '#ff6b6b',
  '#ffd700',
  '#4ecdc4',
  '#a78bfa',
  '#f97316',
];

export const SEAT_STATUS_COLORS = {
  selected: '#ef4444',
  reserved: '#5b4dff',
  sold: '#94a3b8',
} as const;

export function resolveZoneColor(color?: string, index = 0): string {
  if (color?.trim()) return color.trim();
  return ZONE_COLOR_PALETTE[index % ZONE_COLOR_PALETTE.length];
}

export function getSeatDisplayColor(
  status?: string,
  picked?: boolean,
  reservedByMe?: boolean,
  zoneColor?: string
): string {
  if (picked) return SEAT_STATUS_COLORS.selected;
  if (status === 'sold') return SEAT_STATUS_COLORS.sold;
  if (status === 'reserved') return SEAT_STATUS_COLORS.reserved;
  return zoneColor ?? ZONE_COLOR_PALETTE[0];
}
