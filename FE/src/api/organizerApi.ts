import { api } from './client';
import type { Artist, Concert, Order, PaginatedResponse, Venue } from '../types';
import type { ConcertWrite, SeatZone } from './adminApi';

export interface OrganizerDashboard {
  concerts_total: number;
  concerts_draft: number;
  concerts_pending_review: number;
  concerts_published: number;
  orders_total: number;
  revenue_total: number;
  tickets_sold: number;
  venues_owned: number;
}

export interface OrganizerStatistics {
  by_status: Record<string, number>;
  concerts: Array<{
    concert_id: string;
    title: string;
    status: string;
    orders: number;
    revenue: number;
    tickets_sold: number;
  }>;
}

export interface OrganizerOrder extends Order {
  concert_id?: string;
  buyer_email?: string;
  buyer_name?: string;
}

export interface OrganizerTicketSummary {
  concert_id: string;
  title: string;
  status: string;
  start_time: string;
  total: number;
  available: number;
  reserved: number;
  sold: number;
  zones: Array<{
    zone_id: string;
    name: string;
    price: number;
    color: string;
    total: number;
    available: number;
    reserved: number;
    sold: number;
  }>;
}

export interface SeatMapOrganizerResponse {
  zones: Array<{
    zone_id: string;
    name: string;
    price: number;
    color: string;
    seats: Array<{
      seat_id: string;
      row: string;
      number: number;
      status: string;
    }>;
  }>;
  concert_id: string;
  concert_title: string;
}

export const organizerApi = {
  getDashboard: () => api.get<OrganizerDashboard>('api/organizer/dashboard/'),
  getStatistics: () => api.get<OrganizerStatistics>('api/organizer/statistics/'),

  getConcerts: () => api.get<Concert[]>('api/organizer/concerts/'),
  getConcert: (id: string) => api.get<Concert>(`api/organizer/concerts/${id}/`),
  createConcert: (body: ConcertWrite) => api.post<Concert>('api/organizer/concerts/', body),
  updateConcert: (id: string, body: Partial<ConcertWrite>) =>
    api.put<Concert>(`api/organizer/concerts/${id}/`, body),
  deleteConcert: (id: string) => api.delete(`api/organizer/concerts/${id}/`),
  submitConcert: (id: string) => api.post<Concert>(`api/organizer/concerts/${id}/submit/`),
  publishConcert: (id: string) => api.post<Concert>(`api/organizer/concerts/${id}/publish/`),
  syncConcertSeats: (id: string) => api.post(`api/organizer/concerts/${id}/sync_seats/`),
  getConcertSeatmap: (id: string) =>
    api.get<SeatMapOrganizerResponse>(`api/organizer/concerts/${id}/seatmap/`),

  getVenues: (owned?: boolean) =>
    api.get<Venue[]>('api/organizer/venues/', { params: owned ? { owned: '1' } : undefined }),
  createVenue: (body: Partial<Venue>) => api.post<Venue>('api/organizer/venues/', body),
  updateVenue: (id: string, body: Partial<Venue>) => api.put<Venue>(`api/organizer/venues/${id}/`, body),
  deleteVenue: (id: string) => api.delete(`api/organizer/venues/${id}/`),

  getArtists: () => api.get<PaginatedResponse<Artist>>('api/organizer/artists/'),

  getSeatZones: (venueId?: string) =>
    api.get<SeatZone[]>('api/organizer/zones/', { params: venueId ? { venue_id: venueId } : undefined }),
  createSeatZone: (body: Partial<SeatZone>) => api.post<SeatZone>('api/organizer/zones/', body),
  updateSeatZone: (id: string, body: Partial<SeatZone>) => api.put<SeatZone>(`api/organizer/zones/${id}/`, body),
  deleteSeatZone: (id: string) => api.delete(`api/organizer/zones/${id}/`),
  generateSeats: (zoneId: string, rows: string[], seatsPerRow: number) =>
    api.post(`api/organizer/zones/${zoneId}/generate_seats/`, { rows, seats_per_row: seatsPerRow }),

  getOrders: (concertId?: string) =>
    api.get<OrganizerOrder[]>('api/organizer/orders/', {
      params: concertId ? { concert_id: concertId } : undefined,
    }),

  getTickets: (concertId?: string) =>
    api.get<OrganizerTicketSummary[]>('api/organizer/tickets/', {
      params: concertId ? { concert_id: concertId } : undefined,
    }),
};
