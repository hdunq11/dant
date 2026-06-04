export function formatVnd(amount?: number | null): string {
  const n = amount ?? 0;
  return `${Math.round(n).toLocaleString('vi-VN')} đ`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN');
  } catch {
    return iso;
  }
}

export function concertArtistsLabel(concert: { concert_artists?: { artist?: { name?: string } }[] }): string {
  const names = (concert.concert_artists ?? [])
    .map((ca) => ca.artist?.name)
    .filter(Boolean) as string[];
  return names.length ? names.join(', ') : 'Nghệ sĩ';
}

export function orderStatusLabel(status?: string): string {
  switch (status) {
    case 'paid':
      return 'Đã thanh toán';
    case 'pending':
      return 'Chờ thanh toán';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status ?? '—';
  }
}
