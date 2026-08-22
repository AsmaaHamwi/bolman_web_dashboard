import { QueryClient } from '@tanstack/react-query';

/** Poll operational dashboards at reasonable intervals so UI stays responsive. */
export const liveDashboardQueryOptions = {
  staleTime: 30_000,
  refetchInterval: 60_000,
  refetchOnWindowFocus: false,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

