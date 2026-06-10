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
    const { data: caller } = await admin.from('users').select('*').eq('id', callerId).single();
    if (!caller || caller.status !== 'active') throw new Error('Inactive or missing caller profile');

    const body = await req.json();
    const email = normalizeAuthEmail(body?.email);
    const { password, full_name, phone, role, status = 'active', company_id, permissions = {}, license_number } = body;

    if (!email) throw new Error('email is required');

    const fullName = String(full_name ?? '').trim();
    const phoneNorm = phone != null && String(phone).trim() !== '' ? String(phone).trim() : null;

    await assertCanCreate(admin, caller, role, company_id);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phoneNorm, role, status },
    });
    if (createError) throw createError;

    const userId = created.user.id;
    const { error: userUpsertError } = await admin.from('users').upsert({
      id: userId,
      full_name: fullName,
      phone: phoneNorm,
      email,
      role,
      status,
    });
    if (userUpsertError) throw userUpsertError;

    if (role === 'system_staff') {
      const { error: permissionError } = await admin
        .from('system_staff_permissions')
        .upsert({ user_id: userId, ...permissions }, { onConflict: 'user_id' });
      if (permissionError) throw permissionError;
    }
    if (role === 'company_staff') {
      if (!company_id) throw new Error('company_id is required for company staff');
      await upsertCompanyStaffPermissions(admin, userId, company_id, permissions as Record<string, unknown>);
    }
    if (role === 'driver') {
      if (!company_id) throw new Error('company_id is required for driver');
      const { error: driverError } = await admin
        .from('drivers')
        .upsert(
          { user_id: userId, company_id, license_number: license_number || 'TEMP-' + userId.slice(0, 8) },
          { onConflict: 'user_id' },
        );
      if (driverError) throw driverError;
    }

    return new Response(JSON.stringify({ user_id: userId }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
});

function normalizeAuthEmail(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff\u200b-\u200d]/g, '')
    .trim()
    .toLowerCase();
}

async function assertCanCreate(admin: any, caller: any, targetRole: string, companyId?: string) {
  if (caller.role === 'super_admin') return;

  if (targetRole === 'system_staff') {
    const { data } = await admin.from('system_staff_permissions').select('can_manage_system_staff').eq('user_id', caller.id).maybeSingle();
    if (caller.role === 'system_staff' && data?.can_manage_system_staff) return;
  }

  if (targetRole === 'company_owner') {
    const { data } = await admin.from('system_staff_permissions').select('can_manage_companies').eq('user_id', caller.id).maybeSingle();
    if (caller.role === 'system_staff' && data?.can_manage_companies) return;
  }

  if ((targetRole === 'driver' || targetRole === 'company_staff') && companyId) {
    if (caller.role === 'company_owner') {
      const { data } = await admin.from('companies').select('id').eq('id', companyId).eq('owner_user_id', caller.id).maybeSingle();
      if (data) return;
    }
    if (caller.role === 'company_staff' && targetRole === 'driver') {
      const { data } = await admin.from('company_staff_permissions').select('can_manage_drivers').eq('company_id', companyId).eq('user_id', caller.id).maybeSingle();
      if (data?.can_manage_drivers) return;
    }
  }

  throw new Error('Forbidden: insufficient permission to create this user');
}

/** Matches public.company_staff_permissions + optional can_manage_wallets (migration patch). */
async function upsertCompanyStaffPermissions(
  admin: ReturnType<typeof createClient>,
  userId: string,
  companyId: string,
  permissions: Record<string, unknown>,
) {
  const base = {
    user_id: userId,
    company_id: companyId,
    can_manage_buses: !!permissions.can_manage_buses,
    can_manage_trips: !!permissions.can_manage_trips,
    can_manage_bookings: !!permissions.can_manage_bookings,
    can_manage_drivers: !!permissions.can_manage_drivers,
    can_view_reports: !!permissions.can_view_reports,
    can_send_notifications: !!permissions.can_send_notifications,
  };
  const onConflict = 'company_id,user_id';
  const withWallets = { ...base, can_manage_wallets: !!permissions.can_manage_wallets };
  let { error } = await admin.from('company_staff_permissions').upsert(withWallets, { onConflict });
  if (error && /can_manage_wallets|does not exist|column/i.test(String(error.message))) {
    ({ error } = await admin.from('company_staff_permissions').upsert(base, { onConflict }));
  }
  if (error) throw error;
}
