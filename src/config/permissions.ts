import type { Profile } from '../types/domain';

export type SystemPermission =
  | 'can_manage_companies'
  | 'can_manage_cities'
  | 'can_view_reports'
  | 'can_manage_system_staff'
  | 'can_view_bookings'
  | 'can_view_trips'
  | 'can_view_scan_logs';

export type CompanyPermission =
  | 'can_manage_buses'
  | 'can_manage_trips'
  | 'can_manage_bookings'
  | 'can_manage_wallets'
  | 'can_manage_drivers'
  | 'can_view_reports'
  | 'can_send_notifications';

export type SystemRoutePermission =
  | 'manage_companies'
  | 'manage_cities'
  | 'view_reports'
  | 'manage_system_staff'
  | 'view_bookings'
  | 'view_trips'
  | 'view_scan_logs';

export type CompanyRoutePermission =
  | 'manage_buses'
  | 'manage_trips'
  | 'manage_bookings'
  | 'manage_wallets'
  | 'manage_drivers'
  | 'view_reports'
  | 'send_notifications';

export type RoutePermission = SystemRoutePermission | CompanyRoutePermission;

export const systemPermissionKeys: SystemPermission[] = [
  'can_manage_companies',
  'can_manage_cities',
  'can_view_reports',
  'can_manage_system_staff',
  'can_view_bookings',
  'can_view_trips',
  'can_view_scan_logs',
];

export const companyPermissionKeys: CompanyPermission[] = [
  'can_manage_buses',
  'can_manage_trips',
  'can_manage_bookings',
  'can_manage_wallets',
  'can_manage_drivers',
  'can_view_reports',
  'can_send_notifications',
];

const systemPermissionMap: Record<SystemRoutePermission, SystemPermission> = {
  manage_companies: 'can_manage_companies',
  manage_cities: 'can_manage_cities',
  view_reports: 'can_view_reports',
  manage_system_staff: 'can_manage_system_staff',
  view_bookings: 'can_view_bookings',
  view_trips: 'can_view_trips',
  view_scan_logs: 'can_view_scan_logs',
};

const companyPermissionMap: Record<CompanyRoutePermission, CompanyPermission> = {
  manage_buses: 'can_manage_buses',
  manage_trips: 'can_manage_trips',
  manage_bookings: 'can_manage_bookings',
  manage_wallets: 'can_manage_wallets',
  manage_drivers: 'can_manage_drivers',
  view_reports: 'can_view_reports',
  send_notifications: 'can_send_notifications',
};

export function isSystemRole(profile?: Profile | null) {
  return profile?.role === 'super_admin' || profile?.role === 'system_staff';
}

export function isCompanyRole(profile?: Profile | null) {
  return profile?.role === 'company_owner' || profile?.role === 'company_staff';
}

export function hasSystemRoutePermission(
  permissions: Partial<Record<SystemPermission, boolean>> | null | undefined,
  permission: SystemRoutePermission,
) {
  return !!permissions?.[systemPermissionMap[permission]];
}

export function hasCompanyRoutePermission(
  permissions: Partial<Record<CompanyPermission, boolean>> | null | undefined,
  permission: CompanyRoutePermission,
) {
  if (permission === 'manage_wallets') {
    return !!permissions?.can_manage_wallets || !!permissions?.can_manage_bookings;
  }

  return !!permissions?.[companyPermissionMap[permission]];
}

export function getDefaultDashboardPath(profile?: Profile | null) {
  if (isSystemRole(profile)) return '/system';
  if (isCompanyRole(profile)) return '/company';
  return '/settings';
}
