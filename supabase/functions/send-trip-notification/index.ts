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

    const pushResult = rows.length ? await sendFirebasePushNotifications(admin, Array.from(userIds), { trip_id, title, message, type }) : { sent: 0, failed: 0 };

    return new Response(JSON.stringify({ recipients: rows.length, push: pushResult }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

async function sendFirebasePushNotifications(admin: any, userIds: string[], payload: { trip_id: string; title: string; message: string; type: string }) {
  const serviceAccount = getFirebaseServiceAccount();
  const accessToken = await createFirebaseAccessToken(serviceAccount);
  const projectId = serviceAccount.project_id;

  const { data: tokens, error } = await admin.from('user_fcm_tokens').select('user_id, token').eq('is_active', true).in('user_id', userIds);
  if (error) throw error;

  let sent = 0;
  let failed = 0;

  for (const entry of tokens ?? []) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        message: {
          token: entry.token,
          notification: {
            title: payload.title,
            body: payload.message,
          },
          data: {
            trip_id: payload.trip_id,
            type: payload.type,
          },
        },
      }),
    });

    if (response.ok) {
      sent += 1;
      continue;
    }

    failed += 1;
    const body = await response.text();
    if (response.status === 400 || response.status === 404) {
      await admin.from('user_fcm_tokens').update({ is_active: false }).eq('token', entry.token);
    }
    console.error('FCM send failed', response.status, body);
  }

  return { sent, failed };
}

function getFirebaseServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
  }
  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

async function createFirebaseAccessToken(serviceAccount: ServiceAccount) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsignedToken));
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to authenticate with Firebase (${response.status})`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error('Firebase access token missing');
  return data.access_token as string;
}

function pemToArrayBuffer(pem: string) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function base64UrlEncode(value: string | ArrayBuffer | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

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
