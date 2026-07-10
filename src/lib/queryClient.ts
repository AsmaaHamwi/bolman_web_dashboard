import { QueryClient } from '@tanstack/react-query';

/** Poll operational dashboards so list rows stay in sync with the database. */
export const liveDashboardQueryOptions = {
  staleTime: 0,
  refetchInterval: 15_000,
  refetchOnWindowFocus: true,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
