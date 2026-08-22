import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { getMyCompanyId, getCompanyById } from '../services/company.service';

const CACHED_COMPANY_ID_KEY = 'bolman_cached_company_id';

function getCachedCompanyId(): string | null {
  try {
    return localStorage.getItem(CACHED_COMPANY_ID_KEY);
  } catch {
    return null;
  }
}

export function useCompanyContext() {
  const { profile } = useAuth();
  const cachedId = getCachedCompanyId();

  return useQuery({
    queryKey: ['my-company-id', profile?.id, profile?.role],
    queryFn: async () => {
      const id = await getMyCompanyId(profile!.id, profile!.role);
      if (id) {
        try {
          localStorage.setItem(CACHED_COMPANY_ID_KEY, id);
        } catch {
          // ignore
        }
      }
      return id;
    },
    initialData: cachedId ?? undefined,
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


