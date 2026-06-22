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
  organizer?: string | null;
}

export interface Concert {
  id?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  banner_url?: string;
  status?: string;
  service_fee_percent?: number | null;
  venue?: Venue;
  concert_artists?: ConcertArtist[];
  stage_template?: 'auditorium_336' | 'stage1_1000' | string;
  desired_seat_count?: number;
}

export interface OrganizerProfile {
  id?: string;
  company_name?: string;
  business_license?: string;
  contact_phone?: string;
  service_fee_percent?: number;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  is_staff?: boolean;
  organizer_profile?: OrganizerProfile | null;
  created_at?: string;
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
  row?: string;
  number?: number;
  zone_name?: string;
  label?: string;
}

export interface Order {
  id?: string;
  total_price?: number;
  seat_subtotal?: number;
  booking_fee?: number;
  delivery_fee?: number;
  insurance_fee?: number;
  discount_amount?: number;
  platform_commission?: number;
  service_fee_percent_snapshot?: number;
  voucher_code?: string;
  delivery_method?: string;
  has_insurance?: boolean;
  payment_method?: string;
  status?: string;
  created_at?: string;
  concert_id?: string;
  concert_title?: string;
  concert_banner_url?: string;
  concert_venue_name?: string;
  concert_city?: string;
  concert_venue_address?: string;
  concert_start_time?: string;
  concert_end_time?: string;
  recipient_name?: string;
  recipient_email?: string;
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
