import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export async function listNotifications() {
  const { data, error } = await supabase.from('notifications').select('*, user:users(full_name)').order('created_at', { ascending: false });
  throwIfError(error); return data ?? [];
}

export async function sendTripNotification(input: { trip_id: string; title: string; message: string; type?: string }) {
  const { data, error } = await supabase.functions.invoke('send-trip-notification', { body: input });
  throwIfError(error); return data;
}
