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

    const body = await req.json();
    const { mode = 'trip_all', title, message, type = 'trip_notice' } = body;

    // ─── Validate caller can send notifications ───
    await assertCanNotify(admin, callerId, mode, body);

    let userIds: string[] = [];

    // ─── Resolve target user IDs based on mode ───
    if (mode === 'all') {
      // General broadcast: all users with role=passenger that are active
      const { data: users, error } = await admin
        .from('users')
        .select('id')
        .eq('role', 'passenger')
        .eq('status', 'active');
      if (error) throw error;
      userIds = (users ?? []).map((u: any) => u.id);

    } else if (mode === 'trip_all') {
      // All passengers of a specific trip
      const { trip_id } = body;
      if (!trip_id) throw new Error('trip_id is required for mode=trip_all');
      userIds = await getTripUserIds(admin, trip_id);

    } else if (mode === 'trip_selected') {
      // Specific passengers from a trip (must be ≥1)
      const { trip_id, user_ids } = body;
      if (!trip_id) throw new Error('trip_id is required for mode=trip_selected');
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        throw new Error('user_ids must be a non-empty array for mode=trip_selected');
      }
      // Validate all provided user_ids actually belong to the trip
      const tripUserIds = await getTripUserIds(admin, trip_id);
      const tripUserSet = new Set(tripUserIds);
      userIds = user_ids.filter((id: string) => tripUserSet.has(id));
      if (userIds.length === 0) throw new Error('None of the provided user_ids are passengers of this trip');

    } else if (mode === 'user') {
      // Single user
      const { user_id } = body;
      if (!user_id) throw new Error('user_id is required for mode=user');
      userIds = [user_id];

    } else {
      throw new Error(`Unknown mode: ${mode}`);
    }

    // ─── Insert notifications ───
    const tripIdForPush = body.trip_id ?? null;
    const rows = userIds.map((user_id) => ({
      user_id,
      title,
      message,
      type,
      related_trip_id: tripIdForPush,
    }));
    // Chunked so a broadcast to thousands of passengers does not exceed the
    // statement/payload limits of a single insert.
    for (const batch of chunk(rows, 500)) {
      const { error: insertError } = await admin.from('notifications').insert(batch);
      if (insertError) throw insertError;
    }

    // ─── Push notifications ───
    let pushResult: PushResult = { sent: 0, failed: 0, devices: 0, warning: undefined };
    if (rows.length > 0) {
      try {
        pushResult = await sendFirebasePushNotifications(admin, userIds, { trip_id: tripIdForPush, title, message, type });
      } catch (fcmErr: any) {
        console.error('Push notification failed:', fcmErr);
        pushResult = {
          sent: 0,
          failed: userIds.length,
          devices: 0,
          warning: `In-app saved, but Push (FCM) failed: ${fcmErr?.message || 'FCM error'}`,
        };
      }
    }

    return new Response(
      JSON.stringify({ recipients: rows.length, push: pushResult }),
      { headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  }
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Collect all user_ids from confirmed/boarded/completed bookings for a trip */
async function getTripUserIds(admin: any, tripId: string): Promise<string[]> {
  const { data: bookings, error } = await admin
    .from('bookings')
    .select('booker_user_id, booking_passengers(user_id)')
    .eq('trip_id', tripId)
    .in('booking_status', ['confirmed', 'partially_boarded', 'boarded', 'completed']);
  if (error) throw error;

  const userIds = new Set<string>();
  for (const b of bookings ?? []) {
    if (b.booker_user_id) userIds.add(b.booker_user_id);
    for (const p of b.booking_passengers ?? []) {
      if (p.user_id) userIds.add(p.user_id);
    }
  }
  return Array.from(userIds);
}

async function assertCanNotify(admin: any, callerId: string, mode: string, body: any) {
  const { data: caller } = await admin.from('users').select('role,status').eq('id', callerId).single();
  if (!caller || caller.status !== 'active') throw new Error('Inactive caller');

  // super_admin can do everything
  if (caller.role === 'super_admin') return;

  // system_staff can send general and user-level notifications, but not company-specific trip ones
  if (caller.role === 'system_staff') {
    if (mode === 'all' || mode === 'user') return;
    throw new Error('Forbidden: system_staff cannot send trip notifications');
  }

  // company roles can only send trip-related notifications for their own company or direct user notifications
  if (caller.role === 'company_owner' || caller.role === 'company_staff') {
    const tripId = body.trip_id;

    if (tripId) {
      const { data: trip } = await admin.from('trips').select('id, company_id').eq('id', tripId).single();
      if (!trip) throw new Error('Trip not found');

      if (caller.role === 'company_owner') {
        const { data } = await admin
          .from('companies')
          .select('id')
          .eq('id', trip.company_id)
          .eq('owner_user_id', callerId)
          .maybeSingle();
        if (data) return;
      }

      if (caller.role === 'company_staff') {
        const { data } = await admin
          .from('company_staff_permissions')
          .select('can_send_notifications')
          .eq('company_id', trip.company_id)
          .eq('user_id', callerId)
          .maybeSingle();
        if (data?.can_send_notifications) return;
      }

      throw new Error('Forbidden: cannot send notifications for this company');
    }

    // Direct notification to a user (no trip_id)
    if (mode === 'user' && body.user_id) {
      if (caller.role === 'company_owner') {
        const { data } = await admin
          .from('companies')
          .select('id')
          .eq('owner_user_id', callerId)
          .maybeSingle();
        if (data) return;
      }

      if (caller.role === 'company_staff') {
        const { data } = await admin
          .from('company_staff_permissions')
          .select('can_send_notifications')
          .eq('user_id', callerId)
          .eq('can_send_notifications', true)
          .maybeSingle();
        if (data) return;
      }

      throw new Error('Forbidden: caller does not have notification permission');
    }

    throw new Error('Forbidden: trip_id or user_id required for company roles');
  }

  throw new Error('Forbidden: role not allowed to send notifications');
}

// ─────────────────────────────────────────────
// Firebase FCM
// ─────────────────────────────────────────────

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type PushResult = { sent: number; failed: number; devices: number; warning?: string };

/** Must match FcmService._channel.id in the mobile app and the
 *  default_notification_channel_id meta-data in AndroidManifest.xml. */
const ANDROID_CHANNEL_ID = 'bolman_high_importance_channel';

async function sendFirebasePushNotifications(
  admin: any,
  userIds: string[],
  payload: { trip_id: string | null; title: string; message: string; type: string },
): Promise<PushResult> {
  const serviceAccount = getFirebaseServiceAccount();

  // Collect device tokens first: if nobody has a registered device there is
  // nothing to authenticate for, and the caller needs to be told rather than
  // shown a bare success.
  const tokens: { user_id: string; token: string }[] = [];
  for (const batch of chunk(userIds, 200)) {
    const { data, error } = await admin
      .from('user_fcm_tokens')
      .select('user_id, token')
      .eq('is_active', true)
      .in('user_id', batch);
    if (error) throw error;
    tokens.push(...(data ?? []));
  }

  if (tokens.length === 0) {
    return {
      sent: 0,
      failed: 0,
      devices: 0,
      warning:
        'In-app saved, but no push sent: none of the recipients has a registered device ' +
        '(user_fcm_tokens is empty for them).',
    };
  }

  const accessToken = await createFirebaseAccessToken(serviceAccount);
  const projectId = serviceAccount.project_id;

  const fcmData: Record<string, string> = { type: payload.type };
  if (payload.trip_id) fcmData.trip_id = payload.trip_id;
  // Android tray notifications built by the native SDK need this to route the tap
  // back into Dart.
  fcmData.click_action = 'FLUTTER_NOTIFICATION_CLICK';

  const messageFor = (token: string) => ({
    message: {
      token,
      notification: { title: payload.title, body: payload.message },
      data: fcmData,
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: ANDROID_CHANNEL_ID,
          sound: 'default',
          default_vibrate_timings: true,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      webpush: {
        notification: { title: payload.title, body: payload.message, icon: '/logo.svg' },
        fcm_options: { link: '/' },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  const staleTokens: string[] = [];

  // Sent with bounded concurrency: one-at-a-time overruns the function timeout on
  // a large broadcast, all-at-once trips FCM rate limits.
  for (const batch of chunk(tokens, 25)) {
    await Promise.all(
      batch.map(async (entry) => {
        try {
          const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify(messageFor(entry.token)),
          });

          if (response.ok) {
            sent += 1;
            return;
          }

          failed += 1;
          const text = await response.text();
          console.error('FCM send failed', response.status, text);

          // Only retire a token FCM actually rejected as unknown/invalid. A 400 can
          // also mean a malformed message, and retiring the device for that would
          // silently unsubscribe a healthy user.
          if (
            response.status === 404 ||
            text.includes('UNREGISTERED') ||
            text.includes('registration-token-not-registered') ||
            text.includes('INVALID_ARGUMENT')
          ) {
            staleTokens.push(entry.token);
          }
        } catch (err) {
          failed += 1;
          console.error('FCM request error', err);
        }
      }),
    );
  }

  if (staleTokens.length > 0) {
    for (const batch of chunk(staleTokens, 100)) {
      await admin.from('user_fcm_tokens').update({ is_active: false }).in('token', batch);
    }
  }

  const result: PushResult = { sent, failed, devices: tokens.length };
  if (sent === 0 && failed > 0) {
    result.warning = `In-app saved, but all ${failed} push attempt(s) failed. Check the function logs.`;
  }
  return result;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function getFirebaseServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
  }
  return { project_id: parsed.project_id, client_email: parsed.client_email, private_key: parsed.private_key };
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

  if (!response.ok) throw new Error(`Failed to authenticate with Firebase (${response.status})`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Firebase access token missing');
  return data.access_token as string;
}

function pemToArrayBuffer(pem: string) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function base64UrlEncode(value: string | ArrayBuffer | Uint8Array) {
  const bytes =
    typeof value === 'string'
      ? new TextEncoder().encode(value)
      : value instanceof Uint8Array
      ? value
      : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
