import type { CompanyPermission, SystemPermission } from '../config/permissions';
import { supabase } from '../lib/supabase';
import { createUserViaEdge, throwIfInvokeError } from './auth.service';
import { throwIfError } from './errors';

export type StaffUserStatus = 'active' | 'suspended';

export type StaffUser = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: StaffUserStatus;
};

export type SystemStaffPermissions = Record<SystemPermission, boolean>;
export type CompanyStaffPermissions = Record<CompanyPermission, boolean>;

export type SystemStaffRecord = SystemStaffPermissions & {
  user_id: string;
  user: StaffUser | null;
};

export type CompanyStaffRecord = CompanyStaffPermissions & {
  user_id: string;
  company_id: string;
  user: StaffUser | null;
};

export const defaultSystemStaffPermissions: SystemStaffPermissions = {
  can_manage_companies: false,
  can_manage_cities: false,
  can_view_reports: false,
  can_manage_system_staff: false,
  can_view_bookings: false,
  can_view_trips: false,
  can_view_scan_logs: false,
};

export const defaultCompanyStaffPermissions: CompanyStaffPermissions = {
  can_manage_buses: false,
  can_manage_trips: false,
  can_manage_bookings: false,
  can_manage_wallets: false,
  can_manage_drivers: false,
  can_view_reports: false,
  can_send_notifications: false,
};

function sortStaffRows<T extends { user: StaffUser | null }>(rows: T[]) {
  return [...rows].sort((left, right) => (left.user?.full_name || '').localeCompare(right.user?.full_name || ''));
}

function normalizeUser(value: StaffUser | StaffUser[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function mapSystemStaffPermissions(source?: Partial<SystemStaffPermissions> | null): SystemStaffPermissions {
  return {
    can_manage_companies: !!source?.can_manage_companies,
    can_manage_cities: !!source?.can_manage_cities,
    can_view_reports: !!source?.can_view_reports,
    can_manage_system_staff: !!source?.can_manage_system_staff,
    can_view_bookings: !!source?.can_view_bookings,
    can_view_trips: !!source?.can_view_trips,
    can_view_scan_logs: !!source?.can_view_scan_logs,
  };
}

export function mapCompanyStaffPermissions(source?: Partial<CompanyStaffPermissions> | null): CompanyStaffPermissions {
  return {
    can_manage_buses: !!source?.can_manage_buses,
    can_manage_trips: !!source?.can_manage_trips,
    can_manage_bookings: !!source?.can_manage_bookings,
    can_manage_wallets: !!source?.can_manage_wallets,
    can_manage_drivers: !!source?.can_manage_drivers,
    can_view_reports: !!source?.can_view_reports,
    can_send_notifications: !!source?.can_send_notifications,
  };
}

export async function listSystemStaff() {
  const { data, error } = await supabase
    .from('system_staff_permissions')
    .select(`
      user_id,
      can_manage_companies,
      can_manage_cities,
      can_view_reports,
      can_manage_system_staff,
      can_view_bookings,
      can_view_trips,
      can_view_scan_logs,
      user:users(id, full_name, email, phone, status)
    `);

  throwIfError(error);
  const rows = ((data ?? []) as any[]).map((row) => ({
    ...row,
    user: normalizeUser(row.user),
  })) as SystemStaffRecord[];
  return sortStaffRows(rows);
}

const companyStaffSelectWithWallet = `
      user_id,
      company_id,
      can_manage_buses,
      can_manage_trips,
      can_manage_bookings,
      can_manage_wallets,
      can_manage_drivers,
      can_view_reports,
      can_send_notifications,
      user:users(id, full_name, email, phone, status)
    `;

const companyStaffSelectNoWallet = `
      user_id,
      company_id,
      can_manage_buses,
      can_manage_trips,
      can_manage_bookings,
      can_manage_drivers,
      can_view_reports,
      can_send_notifications,
      user:users(id, full_name, email, phone, status)
    `;

export async function listCompanyStaff(companyId: string) {
  let primary = await supabase.from('company_staff_permissions').select(companyStaffSelectWithWallet).eq('company_id', companyId);
  let data: any = primary.data;
  let error = primary.error;

  if (error && /can_manage_wallets|schema cache|column/i.test(String(error.message))) {
    const legacy = await supabase.from('company_staff_permissions').select(companyStaffSelectNoWallet).eq('company_id', companyId);
    data = legacy.data;
    error = legacy.error;
  }

  throwIfError(error);
  const rows = ((data ?? []) as any[]).map((row) => ({
    ...row,
    can_manage_wallets: !!row.can_manage_wallets,
    user: normalizeUser(row.user),
  })) as CompanyStaffRecord[];
  return sortStaffRows(rows);
}

export async function createSystemStaffMember(input: {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  permissions: SystemStaffPermissions;
}) {
  return createUserViaEdge({
    ...input,
    role: 'system_staff',
    permissions: input.permissions,
  });
}

export async function createCompanyStaffMember(input: {
  company_id: string;
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  permissions: CompanyStaffPermissions;
}) {
  return createUserViaEdge({
    ...input,
    role: 'company_staff',
    permissions: input.permissions,
  });
}

export async function updateSystemStaffPermissions(userId: string, permissions: SystemStaffPermissions) {
  const { data, error } = await supabase
    .from('system_staff_permissions')
    .upsert({ user_id: userId, ...permissions }, { onConflict: 'user_id' })
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function updateCompanyStaffPermissions(userId: string, companyId: string, permissions: CompanyStaffPermissions) {
  const { data, error } = await supabase
    .from('company_staff_permissions')
    .upsert({ user_id: userId, company_id: companyId, ...permissions }, { onConflict: 'user_id,company_id' })
    .select()
    .single();

  throwIfError(error);
  return data;
}

export async function getSystemStaffPermissions(userId: string) {
  const { data, error } = await supabase
    .from('system_staff_permissions')
    .select('can_manage_companies, can_manage_cities, can_view_reports, can_manage_system_staff, can_view_bookings, can_view_trips, can_view_scan_logs')
    .eq('user_id', userId)
    .maybeSingle();

  throwIfError(error);
  return data ? mapSystemStaffPermissions(data as Partial<SystemStaffPermissions>) : null;
}

export async function getCompanyStaffPermissions(userId: string, companyId: string) {
  let primary = await supabase
    .from('company_staff_permissions')
    .select('can_manage_buses, can_manage_trips, can_manage_bookings, can_manage_wallets, can_manage_drivers, can_view_reports, can_send_notifications')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle();

  let row = primary.data;
  let err = primary.error;

  if (err && /can_manage_wallets|schema cache|column/i.test(String(err.message))) {
    const legacy = await supabase
      .from('company_staff_permissions')
      .select('can_manage_buses, can_manage_trips, can_manage_bookings, can_manage_drivers, can_view_reports, can_send_notifications')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();
    row = legacy.data ? { ...legacy.data, can_manage_wallets: false } : null;
    err = legacy.error;
  }

  throwIfError(err);
  return row ? mapCompanyStaffPermissions(row as Partial<CompanyStaffPermissions>) : null;
}

export async function updateUserStatus(userId: string, status: StaffUserStatus) {
  const result = await supabase.functions.invoke('admin-update-user-status', {
    body: { user_id: userId, status },
  });
  return throwIfInvokeError(result);
}
