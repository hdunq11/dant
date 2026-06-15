export const CONCERT_STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  published: 'Đang bán',
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
};

export const ORGANIZER_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

export function concertStatusClass(status?: string) {
  return `status-badge status-badge--${status ?? 'draft'}`;
}

export function organizerStatusClass(status?: string) {
  return `status-badge status-badge--org-${status ?? 'pending'}`;
}
