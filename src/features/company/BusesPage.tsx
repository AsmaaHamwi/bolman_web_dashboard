import { SeatMap } from '../../components/booking/SeatMap';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus, MapPin, Plus, ShieldCheck, Trash } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useBuses, useCreateBus, useDeleteBus } from '../../hooks/useFleet';
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
  const deleteBus = useDeleteBus();
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busSearch, setBusSearch] = useState('');
  const [form, setForm] = useState<{ number_bus: string; seat_layout_type: '2_2' | '2_1'; total_seats: number; current_city_id: string }>({ number_bus: '', seat_layout_type: '2_2', total_seats: 45, current_city_id: '' });
  const [seatsBus, setSeatsBus] = useState<any | null>(null);
  const [statusBus, setStatusBus] = useState<any | null>(null);
  const [cityBus, setCityBus] = useState<any | null>(null);
  const [statusValue, setStatusValue] = useState<string>('available');
  const [cityValue, setCityValue] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const loading = company.isPending || isPending;

  const handleCreateBus = () => {
    if (!form.number_bus.trim()) {
      setFormError('يرجى إدخال رقم أو اسم الباص.');
      return;
    }
    if (!form.current_city_id) {
      setFormError('يرجى اختيار المدينة الحالية للباص.');
      return;
    }
    
    setFormError(null);
    if (companyId) {
      create.mutate(
        { ...form, company_id: companyId, current_city_id: form.current_city_id },
        { 
          onSuccess: () => {
             setOpen(false);
             setForm({ number_bus: '', seat_layout_type: '2_2', total_seats: 45, current_city_id: '' });
          }
        }
      );
    }
  };

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

  const handleDeleteBus = async () => {
    const bus = data.find((b: any) => b.number_bus === busSearch);
    if (!bus) {
      alert('الرجاء كتابة واختيار باص صحيح من القائمة.');
      return;
    }
    
    try {
      const blocked = await hasActiveTripForBus(bus.id);
      if (blocked) {
        alert('لا يمكن حذف الباص لأنه مرتبط برحلة نشطة حالياً.');
        return;
      }
    } catch (err) {
      console.error(err);
    }

    deleteBus.mutate(bus.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setBusSearch('');
      },
      onError: (err) => {
        alert(err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف.');
      }
    });
  };

  return (
    <div>

      <PageHeader
        title={messages.company.buses.title}
        subtitle={messages.company.buses.subtitle}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setDeleteOpen(true)} className="bg-red-500 hover:bg-red-600 shadow-glow-red">
              <Trash size={18} />
              حذف باص
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={18} />
              {messages.company.buses.addButton}
            </Button>
          </div>
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
            <Td className="whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title={messages.company.buses.editStatus}
                  onClick={() => {
                    setActionError(null);
                    setStatusBus(bus);
                    setStatusValue(bus.status || 'available');
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-bolman-purple hover:bg-bolman-purple/10 hover:text-bolman-purple dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200 dark:hover:border-bolman-purple dark:hover:bg-bolman-purple/20 transition-all shadow-sm"
                >
                  <ShieldCheck size={17} />
                </button>
                <button
                  type="button"
                  title={messages.company.buses.editCurrentCity}
                  onClick={() => {
                    setActionError(null);
                    setCityBus(bus);
                    setCityValue(bus.current_city_id || '');
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10 transition-all shadow-sm"
                >
                  <MapPin size={17} />
                </button>
                <button
                  type="button"
                  title={messages.company.buses.viewSeats}
                  onClick={() => setSeatsBus(bus)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/10 transition-all shadow-sm"
                >
                  <Bus size={17} />
                </button>
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
            <Select 
              value={form.seat_layout_type} 
              onChange={(e) => {
                const layout = e.target.value as '2_2' | '2_1';
                const defaultSeats = layout === '2_1' ? 30 : 45;
                setForm({ ...form, seat_layout_type: layout, total_seats: defaultSeats });
              }}
            >
              <option value="2_2">2 + 2</option>
              <option value="2_1">1 + 2</option>
            </Select>
          </Field>
          <Field label={messages.company.buses.seatCount}>
            <Select
              value={String(form.total_seats)}
              onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })}
            >
              {form.seat_layout_type === '2_1' ? (
                <>
                  <option value="27">27</option>
                  <option value="30">30</option>
                  <option value="35">35</option>
                  <option value="37">37</option>
                </>
              ) : (
                <>
                  <option value="25">25</option>
                  <option value="40">40</option>
                  <option value="45">45</option>
                </>
              )}
            </Select>
          </Field>
          <Field label={messages.common.currentCity}>
            <Select value={form.current_city_id} onChange={(e) => setForm({ ...form, current_city_id: e.target.value })}>
              <option value="">{messages.common.choose}</option>
              {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </Select>
          </Field>
          {formError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {formError}
            </div>
          )}
          <Button
            disabled={!companyId || create.isPending}
            onClick={handleCreateBus}
          >
            {messages.company.buses.saveWithSeats}
          </Button>
        </div>
      </Modal>

      <Modal open={!!seatsBus} onClose={() => setSeatsBus(null)} title={messages.company.buses.seatsModalTitle}>
        {seatsBus ? (
          <div className="max-h-[75vh] overflow-y-auto p-1">
            {seatsQuery.isPending ? (
              <p className="text-center text-slate-500 py-6">{messages.common.loading}</p>
            ) : (
              <SeatMap seats={seatsQuery.data ?? []} layoutType={seatsBus.seat_layout_type} readonly />
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
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="حذف باص">
        <div className="grid gap-4">
          <Field label="اختر الباص المراد حذفه">
            <Input 
              list="bus-delete-options" 
              value={busSearch} 
              onChange={(e) => setBusSearch(e.target.value)} 
              placeholder="اكتب رقم أو اسم الباص..."
            />
            <datalist id="bus-delete-options">
              {data.map((bus: any) => (
                <option key={bus.id} value={bus.number_bus} />
              ))}
            </datalist>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteBus.isPending}>
              {messages.common.close}
            </Button>
            <Button
              type="button"
              className="bg-red-500 hover:bg-red-600 shadow-glow-red"
              disabled={!busSearch || deleteBus.isPending}
              onClick={handleDeleteBus}
            >
              حذف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
