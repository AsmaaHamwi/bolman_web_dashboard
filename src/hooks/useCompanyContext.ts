import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { getMyCompanyId } from '../services/company.service';

export function useCompanyContext() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['my-company-id', profile?.id, profile?.role],
    queryFn: () => getMyCompanyId(profile!.id, profile!.role),
    enabled: !!profile && ['company_owner', 'company_staff'].includes(profile.role),
  });
}
