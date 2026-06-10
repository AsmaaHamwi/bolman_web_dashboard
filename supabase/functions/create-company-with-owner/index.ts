/// <reference path="../_shared/edge-runtime.d.ts" />
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  let ownerUserId: string | null = null;

  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) throw new Error('Unauthorized');

    const callerId = authData.user.id;
    const { data: caller, error: callerError } = await admin.from('users').select('*').eq('id', callerId).single();
    if (callerError || !caller || caller.status !== 'active') throw new Error('Inactive or missing caller profile');

    await assertCanManageCompanies(admin, caller);

    const body = await req.json();
    const company = body?.company ?? {};
    const owner = body?.owner ?? {};

    const companyName = String(company.name || '').trim();
    const ownerEmail = String(owner.email ?? '')
      .replace(/[\u200e\u200f\u202a-\u202e\ufeff\u200b-\u200d]/g, '')
      .trim()
      .toLowerCase();
    const ownerPassword = String(owner.password || '');
    const ownerFullName = String(owner.full_name || '').trim();

    if (!companyName) throw new Error('company.name is required');
    if (!ownerEmail) throw new Error('owner.email is required');
    if (!ownerFullName) throw new Error('owner.full_name is required');
    if (ownerPassword.length < 8) throw new Error('owner.password must be at least 8 characters');

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: ownerFullName,
        phone: owner.phone ?? null,
        role: 'company_owner',
        status: 'active',
      },
    });

    if (createUserError || !createdUser.user) throw createUserError || new Error('Failed to create owner user');

    ownerUserId = createdUser.user.id;

    const { error: userUpsertError } = await admin.from('users').upsert({
      id: ownerUserId,
      full_name: ownerFullName,
      phone: owner.phone ?? null,
      email: ownerEmail,
      role: 'company_owner',
      status: 'active',
    });

    if (userUpsertError) throw userUpsertError;

    const { data: createdCompany, error: companyError } = await admin
      .from('companies')
      .insert({
        name: companyName,
        phone: company.phone ?? null,
        email: company.email ?? null,
        logo_url: company.logo_url ?? null,
        owner_user_id: ownerUserId,
      })
      .select('id, owner_user_id')
      .single();

    if (companyError || !createdCompany) throw companyError || new Error('Failed to create company');

    return new Response(
      JSON.stringify({
        company_id: createdCompany.id,
        owner_user_id: createdCompany.owner_user_id,
      }),
      { headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  } catch (error: unknown) {
    if (ownerUserId) {
      await admin.auth.admin.deleteUser(ownerUserId).catch(() => null);
      await admin.from('users').delete().eq('id', ownerUserId).catch(() => null);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});

async function assertCanManageCompanies(admin: ReturnType<typeof createClient>, caller: { id: string; role: string }) {
  if (caller.role === 'super_admin') return;

  if (caller.role === 'system_staff') {
    const { data } = await admin
      .from('system_staff_permissions')
      .select('can_manage_companies')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (data?.can_manage_companies) return;
  }

  throw new Error('Forbidden: insufficient permission to create companies');
}
