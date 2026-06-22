import { api } from './client';
import type {
  Concert,
  LoginResponse,
  Order,
  PaginatedResponse,
  PaymentConfig,
  PayPalOrderResponse,
  RecommendationResponse,
  ReserveResponse,
  SeatMapResponse,
  User,
  VoucherValidateResponse,
} from '../types';

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  full_name: string;
  register_as_organizer?: boolean;
  company_name?: string;
  business_license?: string;
  service_fee_percent?: number;
  contact_phone?: string;
}

export const concertApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('api/users/auth/login/', { email, password }),

  register: (body: RegisterPayload) => api.post<User>('api/users/auth/register/', body),

  getMe: () => api.get<User>('api/users/me/'),

  updateProfile: (body: { full_name?: string; avatar_url?: string }) =>
    api.put<User>('api/users/me/', body),

  changePassword: (body: {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
  }) => api.post<{ message?: string }>('api/users/me/change-password/', body),

  getConcerts: (params?: {
    search?: string;
    genre?: string;
    city?: string;
    date?: string;
  }) => api.get<PaginatedResponse<Concert>>('api/concerts/concerts/', { params }),

  getConcertDetail: (id: string) => api.get<Concert>(`api/concerts/concerts/${id}/`),

  getSeatMap: (id: string) => api.get<SeatMapResponse>(`api/concerts/concerts/${id}/seatmap/`),

  getRecommendations: (concertId?: string) =>
    api.get<RecommendationResponse>('api/behaviors/recommend/', {
      params: concertId ? { concert_id: concertId } : undefined,
    }),

  logBehavior: (concertId: string, action: string) =>
    api.post('api/behaviors/behaviors/', { concert_id: concertId, action }),

  getFavorites: () => api.get<Concert[]>('api/users/me/favorites/'),

  addFavorite: (concertId: string) =>
    api.post('api/users/me/favorites/', { concert_id: concertId }),

  removeFavorite: (concertId: string) =>
    api.delete(`api/users/me/favorites/${concertId}/`),

  reserveSeats: (concertId: string, seatIds: string[]) =>
    api.post<ReserveResponse>('api/seats/booking/reserve/', {
      concert_id: concertId,
      seat_ids: seatIds,
    }),

  releaseSeats: (concertId: string) =>
    api.post<{ message?: string; released_count?: number }>('api/seats/booking/release/', {
      concert_id: concertId,
    }),

  validateVoucher: (code: string, seatSubtotal: number) =>
    api.post<VoucherValidateResponse>('api/orders/vouchers/validate/', {
      code,
      seat_subtotal: seatSubtotal,
    }),

  getPaymentConfig: () => api.get<PaymentConfig>('api/orders/payment-config/'),

  createOrder: (body: {
    concert_id: string;
    seat_ids: string[];
    delivery_method: string;
    has_insurance: boolean;
    payment_method: string;
    voucher_code?: string;
  }) => api.post<Order>('api/orders/orders/', body),

  createPayPalOrder: (
    id: string,
    body?: { return_url?: string; cancel_url?: string }
  ) => api.post<PayPalOrderResponse>(`api/orders/orders/${id}/create_paypal_order/`, body ?? {}),

  payOrder: (id: string, paypalOrderId: string) =>
    api.post(`api/orders/orders/${id}/pay/`, { paypal_order_id: paypalOrderId }),

  completePayPal: (body: { token: string; order_id?: string }) =>
    api.post<{ message?: string; order?: Order }>('api/orders/paypal/complete/', body),

  cancelOrder: (id: string) => api.post(`api/orders/orders/${id}/cancel/`),

  getMyOrders: () => api.get<Order[]>('api/users/me/orders/'),

  getMyOrderDetail: (orderId: string) =>
    api.get<Order>(`api/users/me/orders/${orderId}/`),
};
