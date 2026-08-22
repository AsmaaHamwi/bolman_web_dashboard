import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { liveDashboardQueryOptions } from '../lib/queryClient';
import { confirmOfficeCashBooking, listBookings, type BookingsListFilters } from '../services/booking.service';

export const useBookings = (
  companyId?: string | null,
  options?: { enabled?: boolean; page?: number; pageSize?: number; filters?: BookingsListFilters; live?: boolean },
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
    ...(options?.live ? liveDashboardQueryOptions : {}),
  });
export function useConfirmOfficeBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmOfficeCashBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['company-kpis'] });
      qc.invalidateQueries({ queryKey: ['system-kpis'] });
      qc.invalidateQueries({ queryKey: ['company-reports'] });
      qc.invalidateQueries({ queryKey: ['seats'] });
    },
  });
}

