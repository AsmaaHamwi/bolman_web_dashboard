import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { liveDashboardQueryOptions } from '../lib/queryClient';
import { createTripWithStops, getTripStops, listTrips, searchTrips, updateTrip, type TripsListFilters } from '../services/trip.service';

export function useTrips(
  companyId?: string | null,
  options?: { enabled?: boolean; filters?: TripsListFilters; live?: boolean; page?: number; pageSize?: number },
) {
  return useQuery({
    queryKey: ['trips', companyId, options?.page, options?.pageSize, options?.filters],
    queryFn: () =>
      listTrips(companyId, {
        page: options?.page,
        pageSize: options?.pageSize,
        filters: options?.filters,
      }),
    enabled: options?.enabled,
    staleTime: 5 * 60_000,   // 5 minutes – avoid refetch on every page visit
    placeholderData: (previous) => previous,
    ...(options?.live ? liveDashboardQueryOptions : {}),
  });
}
export function useTripStops(tripId?: string) { return useQuery({ queryKey: ['trip-stops', tripId], queryFn: () => getTripStops(tripId!), enabled: !!tripId }); }
export function useSearchTrips(params?: { origin_city_id: string; destination_city_id: string; travel_date: string }) { return useQuery({ queryKey: ['trip-search', params], queryFn: () => searchTrips(params!), enabled: !!params?.origin_city_id && !!params.destination_city_id && !!params.travel_date }); }
export function useCreateTrip() { const qc = useQueryClient(); return useMutation({ mutationFn: createTripWithStops, onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) }); }
export function useUpdateTrip() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, patch }: { id: string; patch: any }) => updateTrip(id, patch), onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) }); }
