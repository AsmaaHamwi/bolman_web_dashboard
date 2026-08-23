import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { getMyCompanyId, getCompanyById } from '../services/company.service';

/**
 * A company id persisted in localStorage was NOT scoped to the signed-in account, and it was fed
 * to the query as `initialData`. Combined with a long staleTime the id could never be revalidated,
 * so a leftover (or corrupted) value pinned every company section to the wrong company and they
 * all came back empty. Resolve the id per session instead, and clear any value left behind.
 */
const LEGACY_CACHED_COMPANY_ID_KEY = 'bolman_cached_company_id';
try {
  localStorage.removeItem(LEGACY_CACHED_COMPANY_ID_KEY);
} catch {
  // ignore
}

export function useCompanyContext() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['my-company-id', profile?.id, profile?.role],
    queryFn: () => getMyCompanyId(profile!.id, profile!.role),
    enabled: !!profile && ['company_owner', 'company_staff'].includes(profile.role),
    staleTime: Infinity,
  });
}

export function useCompanyProfile(companyId?: string | null) {
  return useQuery({
    queryKey: ['company-profile', companyId],
    queryFn: () => getCompanyById(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}
