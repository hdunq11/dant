import { api } from './client';
import type { Artist, Concert, Order, OrganizerProfile, PaginatedResponse, User, Venue } from '../types';

export interface Voucher {
  id?: string;
  code?: string;
  discount_percent?: number;
  description?: string;
  is_active?: boolean;
}

export interface SeatZone {
  id?: string;
  name?: string;
  price?: number;
  color?: string;
  venue_id?: string;
}

export interface ConcertWrite {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  banner_url?: string;
  artists?: string[];
  status?: string;
  event_source?: string;
}

export interface OrganizerConcertWrite {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  banner_url?: string;
  artist_names?: string[];
  service_fee_percent?: number | null;
  stage_template?: 'auditorium_336' | 'stage1_1000';
  desired_seat_count?: number;
}

export interface StageTemplateOption {
  id: 'auditorium_336' | 'stage1_1000';
  label: string;
  description: string;
  capacity: number;
  model_glb_path: string;
}

export interface AdminDashboard {
  users_total: number;
  organizers_pending: number;
  concerts_pending_review: number;
  concerts_published: number;
  venues_total: number;
  orders_total: number;
  orders_paid: number;
  ticket_gmv: number;
  commission_total: number;
  revenue_total: number;
  vouchers_active: number;
}

export interface AdminReports {
  orders_by_status: Record<string, number>;
  concerts_by_status: Record<string, number>;
  organizers_by_status: Record<string, number>;
  users_by_role: Record<string, number>;
  commission_total: number;
  top_concerts: Array<{
    concert_id: string;
    title: string;
    status: string;
    event_source: string;
    service_fee_percent?: number | null;
    orders: number;
    ticket_revenue: number;
    commission: number;
    revenue: number;
    tickets_sold: number;
  }>;
}

export interface AdminUser extends User {
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  organizer_profile?: OrganizerProfile | null;
}

export const adminApi = {
  getDashboard: () => api.get<AdminDashboard>('api/admin/dashboard/'),
  getReports: () => api.get<AdminReports>('api/admin/reports/'),

  getUsers: (params?: { role?: string; organizer_status?: string; search?: string }) =>
    api.get<AdminUser[]>('api/admin/users/', { params }),
  updateUser: (id: string, body: Partial<AdminUser>) => api.patch<AdminUser>(`api/admin/users/${id}/`, body),
  deleteUser: (id: string) => api.delete(`api/admin/users/${id}/`),

  approveOrganizer: (profileId: string) => api.post<AdminUser>(`api/admin/organizers/${profileId}/approve/`),
  rejectOrganizer: (profileId: string, rejection_reason?: string) =>
    api.post<AdminUser>(`api/admin/organizers/${profileId}/reject/`, { rejection_reason }),

  approveConcert: (id: string) => api.post<Concert>(`api/admin/concerts/${id}/approve/`),
  rejectConcert: (id: string) => api.post<Concert>(`api/admin/concerts/${id}/reject/`),
  publishConcert: (id: string) => api.post<Concert>(`api/admin/concerts/${id}/publish/`),

  getArtists: () => api.get<PaginatedResponse<Artist>>('api/artists/artists/'),
  createArtist: (body: Partial<Artist>) => api.post<Artist>('api/artists/artists/', body),
  updateArtist: (id: string, body: Partial<Artist>) => api.put<Artist>(`api/artists/artists/${id}/`, body),
  deleteArtist: (id: string) => api.delete(`api/artists/artists/${id}/`),

  getVenues: () => api.get<PaginatedResponse<Venue>>('api/venues/venues/'),
  createVenue: (body: Partial<Venue>) => api.post<Venue>('api/venues/venues/', body),
  updateVenue: (id: string, body: Partial<Venue>) => api.put<Venue>(`api/venues/venues/${id}/`, body),
  deleteVenue: (id: string) => api.delete(`api/venues/venues/${id}/`),

  getConcerts: (params?: { status?: string; event_source?: string }) =>
    api.get<PaginatedResponse<Concert>>('api/concerts/concerts/', { params }),
  createConcert: (body: ConcertWrite) => api.post<Concert>('api/concerts/concerts/', body),
  updateConcert: (id: string, body: Partial<ConcertWrite>) =>
    api.patch<Concert>(`api/concerts/concerts/${id}/`, body),
  deleteConcert: (id: string) => api.delete(`api/concerts/concerts/${id}/`),

  getOrders: () => api.get<Order[]>('api/orders/orders/'),

  getVouchers: () => api.get<Voucher[]>('api/orders/admin/vouchers/'),
  createVoucher: (body: Partial<Voucher>) => api.post<Voucher>('api/orders/admin/vouchers/', body),
  updateVoucher: (id: string, body: Partial<Voucher>) =>
    api.put<Voucher>(`api/orders/admin/vouchers/${id}/`, body),
  deleteVoucher: (id: string) => api.delete(`api/orders/admin/vouchers/${id}/`),

  getSeatZones: (venueId?: string) =>
    api.get<SeatZone[]>('api/seats/zones/', { params: venueId ? { venue_id: venueId } : undefined }),
  createSeatZone: (body: Partial<SeatZone>) => api.post<SeatZone>('api/seats/zones/', body),
  updateSeatZone: (id: string, body: Partial<SeatZone>) => api.put<SeatZone>(`api/seats/zones/${id}/`, body),
  deleteSeatZone: (id: string) => api.delete(`api/seats/zones/${id}/`),
  generateSeats: (zoneId: string, rows: string[], seatsPerRow: number) =>
    api.post(`api/seats/zones/${zoneId}/generate_seats/`, { rows, seats_per_row: seatsPerRow }),
};
