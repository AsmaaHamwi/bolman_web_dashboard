import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTripWithStops, getTripStops, listTrips, searchTrips, updateTrip, type TripsListFilters } from '../services/trip.service';

export function useTrips(
  companyId?: string | null,
  options?: { enabled?: boolean; filters?: TripsListFilters },
) {
  return useQuery({
    queryKey: ['trips', companyId, options?.filters],
    queryFn: () => listTrips(companyId, options?.filters),
    enabled: options?.enabled,
    placeholderData: (previous) => previous,
  });
}
export function useTripStops(tripId?: string) { return useQuery({ queryKey: ['trip-stops', tripId], queryFn: () => getTripStops(tripId!), enabled: !!tripId }); }
export function useSearchTrips(params?: { origin_city_id: string; destination_city_id: string; travel_date: string }) { return useQuery({ queryKey: ['trip-search', params], queryFn: () => searchTrips(params!), enabled: !!params?.origin_city_id && !!params.destination_city_id && !!params.travel_date }); }
export function useCreateTrip() { const qc = useQueryClient(); return useMutation({ mutationFn: createTripWithStops, onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) }); }
export function useUpdateTrip() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, patch }: { id: string; patch: any }) => updateTrip(id, patch), onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) }); }
