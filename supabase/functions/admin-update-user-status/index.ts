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
    const userId = String(body?.user_id || '');
    const status = String(body?.status || '');
    if (!userId) throw new Error('user_id is required');
    if (!['active', 'suspended'].includes(status)) throw new Error('Invalid status');

    const { data: target } = await admin.from('users').select('*').eq('id', userId).single();
    if (!target) throw new Error('Target user not found');

    await assertCanManageStatus(admin, caller, target);

    const { error: updateError } = await admin.from('users').update({ status }).eq('id', userId);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});

async function assertCanManageStatus(admin: any, caller: any, target: any) {
  if (caller.role === 'super_admin') return;

  if (target.role === 'system_staff') {
    const { data } = await admin
      .from('system_staff_permissions')
      .select('can_manage_system_staff')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (caller.role === 'system_staff' && data?.can_manage_system_staff) return;
  }

  if (target.role === 'company_staff') {
    if (caller.role === 'system_staff') {
      const { data } = await admin
        .from('system_staff_permissions')
        .select('can_manage_companies')
        .eq('user_id', caller.id)
        .maybeSingle();

      if (data?.can_manage_companies) return;
    }

    if (caller.role === 'company_owner') {
      const { data: staffPermission } = await admin
        .from('company_staff_permissions')
        .select('company_id')
        .eq('user_id', target.id)
        .limit(1)
        .maybeSingle();

      if (!staffPermission?.company_id) throw new Error('Company staff record not found');

      const { data: company } = await admin
        .from('companies')
        .select('id')
        .eq('id', staffPermission.company_id)
        .eq('owner_user_id', caller.id)
        .maybeSingle();

      if (company) return;
    }
  }

  throw new Error('Forbidden: insufficient permission to update this account');
}
