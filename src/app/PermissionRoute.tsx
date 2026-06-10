import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { useCompanyStaffPermissions, useSystemStaffPermissions } from '../hooks/usePermissions';
import {
  getDefaultDashboardPath,
  hasCompanyRoutePermission,
  hasSystemRoutePermission,
  type CompanyRoutePermission,
  type SystemRoutePermission,
} from '../config/permissions';
import { useI18n } from '../hooks/useI18n';

type PermissionRouteProps =
  | { permission: CompanyRoutePermission; children: React.ReactNode }
  | { permission: SystemRoutePermission; children: React.ReactNode };

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { profile } = useAuth();
  const { messages } = useI18n();
  const systemPermissions = useSystemStaffPermissions();
  const companyPermissions = useCompanyStaffPermissions();

  if (!profile) return <Navigate to="/login" replace />;

  if (profile.role === 'super_admin' || profile.role === 'company_owner') {
    return <>{children}</>;
  }

  if (profile.role === 'system_staff') {
    if (systemPermissions.isPending) {
      return <div className="grid min-h-screen place-items-center text-bolman-purple">{messages.common.loading}</div>;
    }

    return hasSystemRoutePermission(systemPermissions.data, permission as SystemRoutePermission)
      ? <>{children}</>
      : <Navigate to={getDefaultDashboardPath(profile)} replace />;
  }

  if (profile.role === 'company_staff') {
    if (companyPermissions.isPending) {
      return <div className="grid min-h-screen place-items-center text-bolman-purple">{messages.common.loading}</div>;
    }

    return hasCompanyRoutePermission(companyPermissions.data, permission as CompanyRoutePermission)
      ? <>{children}</>
      : <Navigate to={getDefaultDashboardPath(profile)} replace />;
  }

  return <Navigate to={getDefaultDashboardPath(profile)} replace />;
}
