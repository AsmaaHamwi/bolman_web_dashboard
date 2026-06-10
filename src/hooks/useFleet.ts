import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBusWithSeats, createDriver, createRestStop, listBuses, listBusSeats, listDrivers, listRestStops } from '../services/fleet.service';

export const useBuses = (
  companyId?: string | null,
  options?: { enabled?: boolean; originCityId?: string | null; statusOnlyAvailable?: boolean },
) =>
  useQuery({
    queryKey: ['buses', companyId, options?.originCityId, options?.statusOnlyAvailable],
    queryFn: () =>
      listBuses(companyId, {
        originCityId: options?.originCityId || undefined,
        status: options?.statusOnlyAvailable ? 'available' : undefined,
      }),
    enabled: options?.enabled,
  });
export const useDrivers = (companyId?: string | null, options?: { enabled?: boolean }) =>
  useQuery({ queryKey: ['drivers', companyId], queryFn: () => listDrivers(companyId), enabled: options?.enabled });
export const useBusSeats = (busId?: string) => useQuery({ queryKey: ['bus-seats', busId], queryFn: () => listBusSeats(busId!), enabled: !!busId });
export const useRestStops = (companyId?: string | null) => useQuery({ queryKey: ['rest-stops', companyId], queryFn: () => listRestStops(companyId!), enabled: !!companyId });
export function useCreateBus() { const qc = useQueryClient(); return useMutation({ mutationFn: createBusWithSeats, onSuccess: () => qc.invalidateQueries({ queryKey: ['buses'] }) }); }
export function useCreateDriver() { const qc = useQueryClient(); return useMutation({ mutationFn: createDriver, onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }) }); }
export function useCreateRestStop() { const qc = useQueryClient(); return useMutation({ mutationFn: createRestStop, onSuccess: () => qc.invalidateQueries({ queryKey: ['rest-stops'] }) }); }
