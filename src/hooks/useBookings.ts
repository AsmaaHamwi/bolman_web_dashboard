import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmOfficeCashBooking, listBookings, type BookingsListFilters } from '../services/booking.service';

export const useBookings = (
  companyId?: string | null,
  options?: { enabled?: boolean; page?: number; pageSize?: number; filters?: BookingsListFilters },
) =>
  useQuery({
    queryKey: ['bookings', companyId, options?.page, options?.pageSize, options?.filters],
    queryFn: () =>
      listBookings(companyId, {
        page: options?.page,
        pageSize: options?.pageSize,
        filters: options?.filters,
      }),
    enabled: options?.enabled,
    placeholderData: (previous) => previous,
  });
export function useConfirmOfficeBooking() { const qc = useQueryClient(); return useMutation({ mutationFn: confirmOfficeCashBooking, onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }) }); }
