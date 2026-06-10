import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useBuses, useCreateBus } from '../../hooks/useFleet';
import { useCities } from '../../hooks/useCities';
import { hasActiveTripForBus, listBusSeats, updateBusRecord } from '../../services/fleet.service';

const BUS_STATUSES = ['available', 'in_service', 'inactive'] as const;

export function BusesPage() {
  const queryClient = useQueryClient();
  const company = useCompanyContext();
  const companyId = company.data;
  const { data = [], isPending } = useBuses(companyId, { enabled: !!companyId });
  const { data: cities = [] } = useCities();
  const create = useCreateBus();
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ number_bus: '', seat_layout_type: '2_2' as const, total_seats: 45, current_city_id: '' });
  const [seatsBus, setSeatsBus] = useState<any | null>(null);
  const [statusBus, setStatusBus] = useState<any | null>(null);
  const [cityBus, setCityBus] = useState<any | null>(null);
  const [statusValue, setStatusValue] = useState<string>('available');
  const [cityValue, setCityValue] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const loading = company.isPending || isPending;

  const seatsQuery = useQuery({
    queryKey: ['bus-seats', seatsBus?.id],
    queryFn: () => listBusSeats(seatsBus!.id),
    enabled: !!seatsBus?.id,
  });

  const updateBusMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { status?: string; current_city_id?: string | null } }) => {
      const blocked = await hasActiveTripForBus(id);
      if (blocked) throw new Error(messages.company.buses.activeTripBlock);
      return updateBusRecord(id, patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['buses'] });
      setStatusBus(null);
      setCityBus(null);
      setActionError(null);
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : messages.common.unexpectedError);
    },
  });

  return (
    <div>
      <PageHeader
        title={messages.company.buses.title}
        subtitle={messages.company.buses.subtitle}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} />
            {messages.company.buses.addButton}
          </Button>
        }
      />

      {actionError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {actionError}
        </div>
      ) : null}

      <DataTable columns={messages.company.buses.table as unknown as string[]} loading={loading} empty={!loading && !data.length}>
        {data.map((bus: any) => (
          <tr key={bus.id}>
            <Td className="font-bold">{bus.number_bus}</Td>
            <Td>{bus.seat_layout_type}</Td>
            <Td>{bus.total_seats}</Td>
            <Td>{bus.current_city?.name}</Td>
            <Td><StatusBadge value={bus.status} /></Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setActionError(null);
                    setStatusBus(bus);
                    setStatusValue(bus.status || 'available');
                  }}
                >
                  {messages.company.buses.editStatus}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setActionError(null);
                    setCityBus(bus);
                    setCityValue(bus.current_city_id || '');
                  }}
                >
                  {messages.company.buses.editCurrentCity}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setSeatsBus(bus)}>
                  {messages.company.buses.viewSeats}
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
      <Modal open={open} onClose={() => setOpen(false)} title={messages.company.buses.modalTitle}>
        <div className="grid gap-4">
          <Field label={messages.company.buses.busNumber}>
            <Input value={form.number_bus} onChange={(e) => setForm({ ...form, number_bus: e.target.value })} />
          </Field>
          <Field label={messages.company.buses.layoutType}>
            <Select value={form.seat_layout_type} onChange={(e) => setForm({ ...form, seat_layout_type: e.target.value as any })}>
              <option value="2_2">2 + 2</option>
              <option value="2_1">2 + 1</option>
            </Select>
          </Field>
          <Field label={messages.company.buses.seatCount}>
            <Input type="number" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })} />
          </Field>
          <Field label={messages.common.currentCity}>
            <Select value={form.current_city_id} onChange={(e) => setForm({ ...form, current_city_id: e.target.value })}>
              <option value="">{messages.common.choose}</option>
              {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </Select>
          </Field>
          <Button
            disabled={!companyId}
            onClick={() =>
              companyId &&
              create.mutate(
                { ...form, company_id: companyId, current_city_id: form.current_city_id || null },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {messages.company.buses.saveWithSeats}
          </Button>
        </div>
      </Modal>

      <Modal open={!!seatsBus} onClose={() => setSeatsBus(null)} title={messages.company.buses.seatsModalTitle}>
        {seatsBus ? (
          <div className="max-h-[60vh] overflow-y-auto text-sm">
            {seatsQuery.isPending ? (
              <p>{messages.common.loading}</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2">
                {(seatsQuery.data ?? []).map((seat: any) => (
                  <li key={seat.id} className="rounded-lg border border-slate-200 px-2 py-1 text-center dark:border-bolman-borderDark">
                    #{seat.seat_number}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setSeatsBus(null)}>{messages.common.close}</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!statusBus} onClose={() => !updateBusMutation.isPending && setStatusBus(null)} title={messages.company.buses.statusModalTitle}>
        {statusBus ? (
          <div className="grid gap-4">
            <Field label={messages.common.status}>
              <Select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
                {BUS_STATUSES.map((s) => (
                  <option key={s} value={s}>{messages.status[s as keyof typeof messages.status] ?? s}</option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setStatusBus(null)} disabled={updateBusMutation.isPending}>
                {messages.common.close}
              </Button>
              <Button
                type="button"
                onClick={() => updateBusMutation.mutate({ id: statusBus.id, patch: { status: statusValue } })}
                disabled={updateBusMutation.isPending}
              >
                {messages.common.save}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!cityBus} onClose={() => !updateBusMutation.isPending && setCityBus(null)} title={messages.company.buses.cityModalTitle}>
        {cityBus ? (
          <div className="grid gap-4">
            <Field label={messages.common.currentCity}>
              <Select value={cityValue} onChange={(e) => setCityValue(e.target.value)}>
                <option value="">{messages.common.choose}</option>
                {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCityBus(null)} disabled={updateBusMutation.isPending}>
                {messages.common.close}
              </Button>
              <Button
                type="button"
                onClick={() => updateBusMutation.mutate({ id: cityBus.id, patch: { current_city_id: cityValue || null } })}
                disabled={updateBusMutation.isPending}
              >
                {messages.common.save}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
