const cityMap: Record<string, string> = {
  'Hà Nội': 'Hanoi',
  'TP. Hồ Chí Minh': 'Ho Chi Minh',
  'Đà Nẵng': 'Da Nang',
  'Cần Thơ': 'Can Tho',
  'Hải Phòng': 'Hai Phong',
};

const genreMap: Record<string, string> = {
  Pop: 'pop',
  'K-Pop': 'kpop',
  Rock: 'rock',
  Ballad: 'jazz',
  Jazz: 'jazz',
};

export function mapCity(uiCity?: string | null): string | undefined {
  if (!uiCity || uiCity === 'Tất cả') return undefined;
  return cityMap[uiCity] ?? uiCity;
}

export function mapGenre(uiGenre?: string | null): string | undefined {
  if (!uiGenre || uiGenre === 'Tất cả') return undefined;
  return genreMap[uiGenre] ?? uiGenre.toLowerCase();
}

export const CITIES = ['Tất cả', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
export const GENRES = ['Tất cả', 'Pop', 'K-Pop', 'Rock', 'Ballad', 'Jazz'];
