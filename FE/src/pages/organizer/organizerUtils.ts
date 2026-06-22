export const CONCERT_STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  published: 'Đang bán',
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
};

export function concertStatusClass(status?: string) {
  return `status-badge status-badge--${status ?? 'draft'}`;
}

const DELETABLE_STATUSES = new Set(['draft', 'pending_review', 'rejected']);

export function canOrganizerDeleteConcert(status?: string) {
  return DELETABLE_STATUSES.has(status ?? 'draft');
}

export function isUnapprovedConcert(status?: string) {
  return DELETABLE_STATUSES.has(status ?? 'draft');
}
