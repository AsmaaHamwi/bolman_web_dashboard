/// <reference path="../_shared/edge-runtime.d.ts" />
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) throw new Error('Unauthorized');
    const callerId = authData.user.id;
    const { trip_id, title, message, type = 'trip_notice' } = await req.json();

    const { data: trip, error: tripError } = await admin.from('trips').select('id, company_id').eq('id', trip_id).single();
    if (tripError || !trip) throw new Error('Trip not found');
    await assertCanNotify(admin, callerId, trip.company_id);

    const { data: bookings, error } = await admin.from('bookings').select('booker_user_id, booking_passengers(user_id)').eq('trip_id', trip_id).in('booking_status', ['confirmed','boarded','completed']);
    if (error) throw error;
    const userIds = new Set<string>();
    bookings?.forEach((b: any) => { if (b.booker_user_id) userIds.add(b.booker_user_id); b.booking_passengers?.forEach((p: any) => p.user_id && userIds.add(p.user_id)); });
    const rows = Array.from(userIds).map(user_id => ({ user_id, title, message, type }));
    if (rows.length) await admin.from('notifications').insert(rows);

    // Production push: use Firebase Admin SDK / HTTP v1 server credential here.
    // The DB notification is created now; FCM dispatch can be added in this function safely.
    return new Response(JSON.stringify({ recipients: rows.length }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});

async function assertCanNotify(admin: any, callerId: string, companyId: string) {
  const { data: caller } = await admin.from('users').select('role,status').eq('id', callerId).single();
  if (!caller || caller.status !== 'active') throw new Error('Inactive caller');
  if (caller.role === 'super_admin') return;
  if (caller.role === 'company_owner') {
    const { data } = await admin.from('companies').select('id').eq('id', companyId).eq('owner_user_id', callerId).maybeSingle();
    if (data) return;
  }
  if (caller.role === 'company_staff') {
    const { data } = await admin.from('company_staff_permissions').select('can_send_notifications').eq('company_id', companyId).eq('user_id', callerId).maybeSingle();
    if (data?.can_send_notifications) return;
  }
  throw new Error('Forbidden: cannot send notifications for this company');
}
