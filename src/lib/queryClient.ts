import { QueryClient } from '@tanstack/react-query';

/** Poll operational dashboards at reasonable intervals so UI stays responsive. */
export const liveDashboardQueryOptions = {
  staleTime: 0,
  refetchInterval: 15_000,
  refetchOnWindowFocus: true,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});


