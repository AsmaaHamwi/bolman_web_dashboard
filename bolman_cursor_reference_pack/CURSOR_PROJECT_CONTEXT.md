# Bolman Cursor Project Context

## Project

Bolman is an intercity bus booking platform with:
- Passenger mobile app
- Driver mobile app
- Company dashboard
- System dashboard
- Supabase backend
- Firebase notifications

The key feature is segment-based seat booking. A seat can be reserved for part of a trip and reused later if segments do not overlap.

## Backend contract

Use Supabase Auth. public.users.id must match auth.users.id.
public.users stores profile, role, status, phone, email. It does not store passwords.

Important tables:
- users
- system_staff_permissions
- company_staff_permissions
- companies
- cities
- rest_stops
- buses
- bus_seats
- drivers
- trips
- trip_stops
- bookings
- booking_passengers
- booking_seats
- seat_locks
- wallets
- wallet_transactions
- payments
- tickets
- notifications
- qr_scan_logs
- user_fcm_tokens

Important RPC:
- search_trips
- get_seats_status
- lock_seats
- confirm_wallet_booking
- confirm_office_cash_booking
- scan_ticket_qr
- rate_booking
- register_fcm_token

## Permissions

Keep system and company permissions separate.

system_staff_permissions:
- can_manage_companies
- can_manage_cities
- can_view_reports
- can_manage_system_staff
- can_view_bookings
- can_view_trips
- can_view_scan_logs

company_staff_permissions:
- company_id
- can_manage_buses
- can_manage_trips
- can_manage_bookings
- can_manage_drivers
- can_view_reports
- can_send_notifications

Company staff must only access their own company data.

## Seat logic

Seat status is calculated dynamically:
- inactive: bus_seats.is_active = false
- reserved: confirmed booking_seats overlap the requested segment
- locked: active seat_locks overlap the requested segment
- available: no conflict

Overlap:
existing_from_order < requested_to_order AND existing_to_order > requested_from_order

## Booking transaction

Wallet booking must be atomic:
1. verify locks
2. verify wallet balance
3. create booking
4. create booking_passengers
5. create booking_seats
6. create wallet_transaction
7. create payment
8. create ticket
9. delete/disable locks
10. commit

Rollback on failure.

## Final UX decisions

Search screen:
- from city
- to city
- date
No passenger count on search.

National ID:
- only in booking_passengers.national_id
- not unique
- not in users

Group QR:
- scanning one QR means all passengers boarded

Rating:
- inside bookings
- one stars-only rating per booking
- no comment

Payments:
- bookings 1:N payments

## Web development

Use React + Vite + TypeScript + Tailwind.
Use TanStack Query for Supabase data.
Use Zustand for local UI state.
Use React Hook Form + Zod for forms.

Structure:
- src/lib
- src/services
- src/hooks
- src/features
- src/components
- src/stores
- src/i18n
- src/types

## Mobile development

Use Flutter with Cubit.
Repository -> Cubit -> UI.

Important Cubits:
- AuthCubit
- ThemeCubit
- LocaleCubit
- TripSearchCubit
- SeatSelectionCubit
- BookingCubit
- WalletCubit
- TicketCubit
- DriverTripsCubit
- QrScanCubit

## Main acceptance scenario

The complete system must support:
1. Admin creates cities.
2. Admin creates company and owner.
3. Company creates buses, seats, drivers.
4. Company creates trip with trip_stops.
5. Passenger searches by from/to/date.
6. Passenger selects trip and segment.
7. Passenger sees seats via get_seats_status.
8. Passenger locks seats.
9. Passenger enters passenger names and national IDs.
10. Passenger confirms wallet booking.
11. Ticket QR is generated.
12. Company dashboard sees booking.
13. Driver scans QR.
14. Booking/ticket status updates.
15. QR scan log appears in system dashboard.
