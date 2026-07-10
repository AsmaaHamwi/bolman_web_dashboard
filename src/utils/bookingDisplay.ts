type BookingPassengerRow = {
  full_name?: string | null;
  created_at?: string | null;
};

export type BookingBookerRow = {
  booker?: { full_name?: string | null } | null;
  creator?: { full_name?: string | null } | null;
  booker_user_id?: string | null;
  created_by_user_id?: string | null;
  booking_passengers?: BookingPassengerRow[];
};

export function primaryPassengerName(booking: BookingBookerRow): string | null {
  const passengers = [...(booking.booking_passengers ?? [])].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return leftTime - rightTime;
  });

  for (const passenger of passengers) {
    const name = passenger.full_name?.trim();
    if (name) return name;
  }

  return null;
}

/** Booker column: profile name when visible, else first passenger (app bookings under RLS). */
export function bookerDisplay(booking: BookingBookerRow, officeLabel: string): string {
  const fromProfile = booking.booker?.full_name?.trim() || booking.creator?.full_name?.trim();
  if (fromProfile) return fromProfile;

  const passengerName = primaryPassengerName(booking);
  if (passengerName) return passengerName;

  return officeLabel;
}

export function sortBookingsByCreatedAtDesc<T extends { created_at?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}
