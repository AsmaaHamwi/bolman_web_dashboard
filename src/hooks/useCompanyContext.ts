import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { getMyCompanyId, getCompanyById } from '../services/company.service';

export function useCompanyContext() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['my-company-id', profile?.id, profile?.role],
    queryFn: () => getMyCompanyId(profile!.id, profile!.role),
    enabled: !!profile && ['company_owner', 'company_staff'].includes(profile.role),
  });
}

export function useCompanyProfile(companyId?: string | null) {
  return useQuery({
    queryKey: ['company-profile', companyId],
    queryFn: () => getCompanyById(companyId!),
    enabled: !!companyId,
  });
}
