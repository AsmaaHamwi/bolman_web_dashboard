import { useMutation, useQuery } from '@tanstack/react-query';
import { getSeatsStatus, lockSeats } from '../services/seat.service';

export function useSeatStatus(params?: { tripId: string; fromTripStopId: string; toTripStopId: string }) {
  return useQuery({
    queryKey: ['seat-status', params],
    queryFn: () => getSeatsStatus(params!.tripId, params!.fromTripStopId, params!.toTripStopId),
    enabled: !!params?.tripId && !!params?.fromTripStopId && !!params?.toTripStopId,
  });
}
export function useLockSeats() { return useMutation({ mutationFn: lockSeats }); }
