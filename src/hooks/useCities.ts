import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCity, listCities, updateCity } from '../services/catalog.service';

export function useCities() { return useQuery({ queryKey: ['cities'], queryFn: listCities }); }
export function useCreateCity() { const qc = useQueryClient(); return useMutation({ mutationFn: createCity, onSuccess: () => qc.invalidateQueries({ queryKey: ['cities'] }) }); }
export function useUpdateCity() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, patch }: { id: string; patch: any }) => updateCity(id, patch), onSuccess: () => qc.invalidateQueries({ queryKey: ['cities'] }) }); }
