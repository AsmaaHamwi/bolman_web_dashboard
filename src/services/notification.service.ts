import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export async function listNotifications() {
  const { data, error } = await supabase.from('notifications').select('*, user:users(full_name)').order('created_at', { ascending: false });
  throwIfError(error); return data ?? [];
}

/** Send a notification to ALL users in the system */
export async function sendGeneralNotification(input: { title: string; message: string }) {
  const { data, error } = await supabase.functions.invoke('send-trip-notification', {
    body: { mode: 'all', ...input },
  });
  throwIfError(error); return data;
}

/** Send a notification to passengers of a specific trip.
 *  If user_ids is provided, only those users receive it; otherwise all trip passengers. */
export async function sendTripNotification(input: {
  trip_id: string;
  title: string;
  message: string;
  type?: string;
  user_ids?: string[];
}) {
  const mode = input.user_ids && input.user_ids.length > 0 ? 'trip_selected' : 'trip_all';
  const { data, error } = await supabase.functions.invoke('send-trip-notification', {
    body: { mode, type: 'trip_notice', ...input },
  });
  throwIfError(error); return data;
}

/** Send a notification to a single specific user.
 *  Optionally pass trip_id when the notification is in the context of a trip. */
export async function sendUserNotification(input: {
  user_id: string;
  title: string;
  message: string;
  trip_id?: string;
}) {
  const { data, error } = await supabase.functions.invoke('send-trip-notification', {
    body: { mode: 'user', type: 'direct_notice', ...input },
  });
  throwIfError(error); return data;
}

/** Search users by name or phone for the user-picker */
export async function searchUsers(query: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .in('role', ['passenger'])
    .limit(20);
  throwIfError(error); return data ?? [];
}

/** Get passengers of a trip who have app accounts (user_id not null).
 *  Returns a deduplicated list of { user_id, full_name, phone }. */
export async function getTripPassengers(tripId: string) {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('booker_user_id, booker:users!bookings_booker_user_id_fkey(full_name, phone), booking_passengers(user_id, full_name, phone)')
    .eq('trip_id', tripId)
    .in('booking_status', ['confirmed', 'partially_boarded', 'boarded', 'completed']);
  throwIfError(error);

  const seen = new Set<string>();
  const result: { user_id: string; full_name: string; phone: string | null }[] = [];

  for (const booking of bookings ?? []) {
    // Add booker if has account
    if (booking.booker_user_id && !seen.has(booking.booker_user_id)) {
      seen.add(booking.booker_user_id);
      result.push({
        user_id: booking.booker_user_id,
        full_name: (booking.booker as any)?.full_name ?? 'غير معروف',
        phone: (booking.booker as any)?.phone ?? null,
      });
    }
    // Add passengers with accounts
    for (const p of (booking.booking_passengers as any[]) ?? []) {
      if (p.user_id && !seen.has(p.user_id)) {
        seen.add(p.user_id);
        result.push({ user_id: p.user_id, full_name: p.full_name ?? 'غير معروف', phone: p.phone ?? null });
      }
    }
  }

  return result;
}
