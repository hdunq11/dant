import type { PaginatedResponse } from '../types';

/** Chuẩn hóa response API: mảng thuần hoặc phân trang `{ results: [] }` */
export function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const results = (data as PaginatedResponse<T>).results;
    if (Array.isArray(results)) return results;
  }
  return [];
}
