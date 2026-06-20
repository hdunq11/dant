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

export function formatTicketDay(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit' });
  } catch {
    return '—';
  }
}

export function formatTicketMonthYear(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `Tháng ${String(d.getMonth() + 1).padStart(2, '0')} ${d.getFullYear()}`;
  } catch {
    return '';
  }
}

export function formatConcertTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return '—';
  try {
    const s = new Date(start);
    const datePart = s.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const startTime = s.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (end) {
      const e = new Date(end);
      const endTime = e.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `${startTime} – ${endTime}, ${datePart}`;
    }
    return `${startTime}, ${datePart}`;
  } catch {
    return start;
  }
}

export function isConcertEnded(start?: string | null, end?: string | null): boolean {
  const now = Date.now();
  if (end) return new Date(end).getTime() < now;
  if (start) return new Date(start).getTime() < now;
  return false;
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
      return 'Thành công';
    case 'pending':
      return 'Chờ thanh toán';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status ?? '—';
  }
}

export function paymentMethodLabel(method?: string): string {
  switch (method) {
    case 'paypal':
      return 'PayPal';
    default:
      return method ?? '—';
  }
}

export function deliveryMethodLabel(method?: string): string {
  switch (method) {
    case 'e_ticket':
      return 'Vé điện tử';
    case 'paper':
      return 'Vé giấy';
    default:
      return method ?? 'Vé điện tử';
  }
}
