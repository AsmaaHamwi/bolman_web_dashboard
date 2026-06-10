import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useDrivers } from '../../hooks/useFleet';
import { createUserViaEdge, updateUserStatusViaEdge } from '../../services/auth.service';
import { hasActiveTripForDriver, updateDriverRecord, updateUserProfile } from '../../services/fleet.service';

export function DriversPage() {
  const queryClient = useQueryClient();
  const company = useCompanyContext();
  const companyId = company.data;
  const { data = [], isPending } = useDrivers(companyId, { enabled: !!companyId });
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '12345678', license_number: '' });
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', license_number: '' });
  const [actionError, setActionError] = useState<string | null>(null);
  const loading = company.isPending || isPending;

  const saveDriverMutation = useMutation({
    mutationFn: async () => {
      if (!editing?.user?.id) throw new Error(messages.common.unexpectedError);
      await updateUserProfile(editing.user.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
      });
      await updateDriverRecord(editing.id, { license_number: editForm.license_number.trim() });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['drivers', companyId] });
      setEditing(null);
      setActionError(null);
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : messages.common.unexpectedError);
    },
  });

  const toggleDriverMutation = useMutation({
    mutationFn: async (driver: any) => {
      const next = driver.status === 'active' ? 'suspended' : 'active';
      if (next === 'suspended') {
        const blocked = await hasActiveTripForDriver(driver.id);
        if (blocked) throw new Error(messages.company.drivers.activeTripBlock);
      }
      await updateUserStatusViaEdge({ user_id: driver.user.id, status: next === 'active' ? 'active' : 'suspended' });
      await updateDriverRecord(driver.id, { status: next });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['drivers', companyId] });
      setActionError(null);
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : messages.common.unexpectedError);
    },
  });

  async function submitCreate() {
    if (!companyId) return;
    setActionError(null);
    try {
      await createUserViaEdge({ ...form, role: 'driver', company_id: companyId });
      await queryClient.invalidateQueries({ queryKey: ['drivers', companyId] });
      setOpen(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : messages.common.unexpectedError);
    }
  }

  function openEdit(driver: any) {
    setActionError(null);
    setEditing(driver);
    setEditForm({
      full_name: driver.user?.full_name || '',
      phone: driver.user?.phone || '',
      license_number: driver.license_number || '',
    });
  }

  return (
    <div>
      <PageHeader
        title={messages.company.drivers.title}
        subtitle={messages.company.drivers.subtitle}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} />
            {messages.company.drivers.addButton}
          </Button>
        }
      />

      {actionError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {actionError}
        </div>
      ) : null}

      <DataTable columns={messages.company.drivers.table as unknown as string[]} loading={loading} empty={!loading && !data.length}>
        {data.map((driver: any) => (
          <tr key={driver.id}>
            <Td className="font-bold">{driver.user?.full_name}</Td>
            <Td>{driver.user?.phone}</Td>
            <Td>{driver.license_number}</Td>
            <Td><StatusBadge value={driver.status} /></Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => openEdit(driver)}>
                  {messages.company.drivers.editDriver}
                </Button>
                <Button
                  type="button"
                  variant={driver.status === 'active' ? 'danger' : 'mint'}
                  onClick={() => toggleDriverMutation.mutate(driver)}
                  disabled={toggleDriverMutation.isPending}
                >
                  {driver.status === 'active' ? messages.common.disable : messages.common.enable}
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
      <Modal open={open} onClose={() => setOpen(false)} title={messages.company.drivers.modalTitle}>
        <div className="grid gap-4">
          <Field label={messages.common.name}>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label={messages.common.email}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={messages.common.phone}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={messages.company.drivers.licenseNumber}>
            <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
          </Field>
          <Button onClick={submitCreate}>{messages.company.drivers.createAndAssign}</Button>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => !saveDriverMutation.isPending && setEditing(null)} title={messages.company.drivers.editDriver}>
        {editing ? (
          <div className="grid gap-4">
            <Field label={messages.common.name}>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </Field>
            <Field label={messages.common.phone}>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </Field>
            <Field label={messages.company.drivers.licenseNumber}>
              <Input value={editForm.license_number} onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={saveDriverMutation.isPending}>
                {messages.common.close}
              </Button>
              <Button type="button" onClick={() => saveDriverMutation.mutate()} disabled={saveDriverMutation.isPending}>
                {messages.common.save}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
