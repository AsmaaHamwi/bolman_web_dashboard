import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { getCompanyStaffPermissions, getSystemStaffPermissions } from '../services/staff.service';
import { useCompanyContext } from './useCompanyContext';

export function useSystemStaffPermissions() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['my-system-permissions', profile?.id],
    queryFn: () => getSystemStaffPermissions(profile!.id),
    enabled: profile?.role === 'system_staff',
  });
}

export function useCompanyStaffPermissions() {
  const { profile } = useAuth();
  const company = useCompanyContext();

  return useQuery({
    queryKey: ['my-company-permissions', profile?.id, company.data],
    queryFn: () => getCompanyStaffPermissions(profile!.id, company.data!),
    enabled: profile?.role === 'company_staff' && !!company.data,
  });
}
