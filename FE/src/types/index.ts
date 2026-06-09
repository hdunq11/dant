export interface Artist {
  id?: string;
  name?: string;
  genre?: string;
  description?: string;
  image_url?: string;
}

export interface ConcertArtist {
  artist?: Artist;
}

export interface Venue {
  id?: string;
  name?: string;
  city?: string;
  address?: string;
  capacity?: number;
  model_glb_path?: string;
}

export interface Concert {
  id?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  banner_url?: string;
  venue?: Venue;
  concert_artists?: ConcertArtist[];
}

export interface User {
  id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  is_staff?: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface PaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

export interface SeatMapSeat {
  seat_id?: string;
  row?: string;
  number?: number;
  status?: string;
  selectable?: boolean;
  reserved_by_me?: boolean;
  pos_x?: number;
  pos_y?: number;
  pos_z?: number;
}

export interface SeatMapZone {
  zone_id?: string;
  name?: string;
  price?: number;
  color?: string;
  seats?: SeatMapSeat[];
}

export interface SeatMapResponse {
  zones?: SeatMapZone[];
}

export interface RecommendationResponse {
  recommendedConcerts?: Concert[];
  recommendedZone?: string;
}

export interface ReserveResponse {
  message?: string;
  reserved_until?: string;
  reserved_count?: number;
}

export interface VoucherValidateResponse {
  valid?: boolean;
  code?: string;
  discount_percent?: number;
  discount_amount?: number;
  description?: string;
  error?: string;
}

export interface OrderItem {
  id?: string;
  seat?: { row_label?: string; seat_number?: number; zone?: { name?: string } };
  price?: number;
}

export interface Order {
  id?: string;
  total_price?: number;
  seat_subtotal?: number;
  booking_fee?: number;
  delivery_fee?: number;
  insurance_fee?: number;
  discount_amount?: number;
  voucher_code?: string;
  delivery_method?: string;
  payment_method?: string;
  status?: string;
  created_at?: string;
  concert_title?: string;
  items?: OrderItem[];
}

export interface PaymentConfig {
  enabled?: boolean;
  client_id?: string;
  provider?: string;
  currency?: string;
}

export interface PayPalOrderResponse {
  paypal_order_id?: string;
  client_id?: string;
  approval_url?: string;
  amount?: number;
  currency?: string;
}

export interface SelectedSeatDetail {
  seatId: string;
  zoneId: string;
  zoneName: string;
  row: string;
  number: number;
  price: number;
}

export interface CheckoutState {
  concertId: string;
  seatIds: string[];
  seatSubtotal: number;
  reservedUntil: string;
  seatDetails: SelectedSeatDetail[];
}
