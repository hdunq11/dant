import { api } from './client';
import type { Artist, Concert, Order, PaginatedResponse, Venue } from '../types';

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
}

export const adminApi = {
  getArtists: () => api.get<PaginatedResponse<Artist>>('api/artists/artists/'),
  createArtist: (body: Partial<Artist>) => api.post<Artist>('api/artists/artists/', body),
  updateArtist: (id: string, body: Partial<Artist>) => api.put<Artist>(`api/artists/artists/${id}/`, body),
  deleteArtist: (id: string) => api.delete(`api/artists/artists/${id}/`),

  getVenues: () => api.get<PaginatedResponse<Venue>>('api/venues/venues/'),
  createVenue: (body: Partial<Venue>) => api.post<Venue>('api/venues/venues/', body),
  updateVenue: (id: string, body: Partial<Venue>) => api.put<Venue>(`api/venues/venues/${id}/`, body),
  deleteVenue: (id: string) => api.delete(`api/venues/venues/${id}/`),

  getConcerts: () => api.get<PaginatedResponse<Concert>>('api/concerts/concerts/'),
  createConcert: (body: ConcertWrite) => api.post<Concert>('api/concerts/concerts/', body),
  updateConcert: (id: string, body: Partial<ConcertWrite>) =>
    api.put<Concert>(`api/concerts/concerts/${id}/`, body),
  deleteConcert: (id: string) => api.delete(`api/concerts/concerts/${id}/`),
  syncConcertSeats: (id: string) => api.post(`api/concerts/concerts/${id}/sync_seats/`),

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
