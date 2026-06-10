export type UserRole = 'super_admin' | 'system_staff' | 'company_owner' | 'company_staff' | 'driver' | 'passenger';
export type AccountStatus = 'active' | 'suspended';
export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'partially_boarded' | 'boarded' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type SeatStatus = 'available' | 'reserved' | 'locked' | 'inactive';
export type TicketType = 'group' | 'individual';
export type QrScanResult = 'valid' | 'invalid' | 'cancelled' | 'already_boarded';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  status: AccountStatus;
}

export interface Company {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  status: 'active' | 'suspended';
  owner_user_id: string;
}

export interface City {
  id: string;
  name: string;
  is_active: boolean;
}

export interface SeatStatusRow {
  bus_seat_id: string;
  seat_number: number;
  column_position: string | null;
  status: SeatStatus;
}

export interface TripSearchRow {
  trip_id: string;
  company_id: string;
  company_name: string;
  bus_id: string;
  from_trip_stop_id: string;
  to_trip_stop_id: string;
  from_city_name: string;
  to_city_name: string;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  final_price: number;
  offer_is: boolean;
  title_offer: string | null;
  available_seats_count: number;
}

export interface BookingPassengerInput {
  full_name: string;
  phone?: string;
  national_id: string;
  user_id?: string | null;
}
