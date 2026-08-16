import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useDrivers } from '../../hooks/useFleet';
import { createUserViaEdge, updateUserStatusViaEdge } from '../../services/auth.service';
import { getActiveTripForDriver, updateDriverRecord, updateUserProfile } from '../../services/fleet.service';
import { sanitizeName, sanitizePositiveDigits, isValidName, getSyrianPhoneError } from '../../utils/validation';
import { formatDateTime } from '../../utils/format';
import { supabase } from '../../lib/supabase';


export function DriversPage() {
  const queryClient = useQueryClient();
  const company = useCompanyContext();
  const companyId = company.data;
  const { data = [], isPending } = useDrivers(companyId, { enabled: !!companyId });
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '12345678', license_number: '' });
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', license_number: '', status: 'active' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<{ driverName: string; arrivalTime: string | null } | null>(null);
  
  // Validation errors states
  const [formErrors, setFormErrors] = useState<{ full_name?: string; email?: string; phone?: string; license_number?: string }>({});
  const [editFormErrors, setEditFormErrors] = useState<{ full_name?: string; phone?: string; license_number?: string }>({});
  
  const loading = company.isPending || isPending;

  const saveDriverMutation = useMutation({
    mutationFn: async () => {
      if (!editing?.user?.id) throw new Error(messages.common.unexpectedError);
      
      const currentStatus = editing.status;
      const nextStatus = editForm.status;
      
      if (currentStatus === 'active' && nextStatus === 'suspended') {
        const activeTrip = await getActiveTripForDriver(editing.id);
        if (activeTrip) {
          setPendingSuspend({
            driverName: editForm.full_name.trim(),
            arrivalTime: activeTrip.expected_arrival_datetime ?? null,
          });
          throw new Error('__active_trip__');
        }
      }

      await updateUserProfile(editing.user.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
      });

      await updateDriverRecord(editing.id, { 
        license_number: editForm.license_number.trim(),
        status: nextStatus,
      });

      if (currentStatus !== nextStatus) {
        try {
          await updateUserStatusViaEdge({ user_id: editing.user.id, status: nextStatus as 'active' | 'suspended' });
        } catch {
          try {
            await supabase.from('users').update({ status: nextStatus }).eq('id', editing.user.id);
          } catch {
            // Ignore if users table update is restricted
          }
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['drivers', companyId] });
      setEditing(null);
      setActionError(null);
    },
    onError: (e) => {
      if (e instanceof Error && e.message === '__active_trip__') {
        setEditing(null);
        return;
      }
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('insufficient permission') || msg.includes('الصلاحية الكافية') || msg.includes('Forbidden')) {
        setActionError(messages.company.drivers.permissionError);
      } else {
        setActionError(msg || messages.common.unexpectedError);
      }
    },
  });

  const toggleDriverMutation = useMutation({
    mutationFn: async (driver: any) => {
      const next = driver.status === 'active' ? 'suspended' : 'active';
      if (next === 'suspended') {
        const activeTrip = await getActiveTripForDriver(driver.id);
        if (activeTrip) {
          // Don't throw — surface a friendly info notice instead
          setPendingSuspend({
            driverName: driver.user?.full_name ?? '',
            arrivalTime: activeTrip.expected_arrival_datetime ?? null,
          });
          // Abort the mutation without error
          throw new Error('__active_trip__');
        }
      }
      // 1. Always update the driver record in drivers table first
      await updateDriverRecord(driver.id, { status: next });

      // 2. Try syncing user account status via Edge or direct update
      try {
        await updateUserStatusViaEdge({ user_id: driver.user.id, status: next === 'active' ? 'active' : 'suspended' });
      } catch {
        try {
          await supabase.from('users').update({ status: next }).eq('id', driver.user.id);
        } catch {
          // Ignore
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['drivers', companyId] });
      setActionError(null);
    },
    onError: (e) => {
      if (e instanceof Error && e.message === '__active_trip__') return; // handled via pendingSuspend
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('insufficient permission') || msg.includes('الصلاحية الكافية') || msg.includes('Forbidden')) {
        setActionError(messages.company.drivers.permissionError);
      } else {
        setActionError(msg || messages.common.unexpectedError);
      }
    },
  });

  function validateForm(): boolean {
    const errs: typeof formErrors = {};
    
    const nameVal = form.full_name.trim();
    if (!nameVal) {
      errs.full_name = 'يرجى إدخال الاسم.';
    } else if (!isValidName(nameVal)) {
      errs.full_name = 'الاسم يجب أن يتكون من حرفين على الأقل وبدون رموز.';
    }
    
    const emailVal = form.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      errs.email = 'يرجى إدخال البريد الإلكتروني.';
    } else if (!emailRegex.test(emailVal)) {
      errs.email = 'البريد الإلكتروني غير صالح (مثال: example@domain.com).';
    }
    
    const phoneErr = getSyrianPhoneError(form.phone, true);
    if (phoneErr) {
      errs.phone = phoneErr;
    }
    
    if (!form.license_number.trim()) {
      errs.license_number = 'يرجى إدخال رقم الرخصة.';
    }
    
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateEditForm(): boolean {
    const errs: typeof editFormErrors = {};
    
    const nameVal = editForm.full_name.trim();
    if (!nameVal) {
      errs.full_name = 'يرجى إدخال الاسم.';
    } else if (!isValidName(nameVal)) {
      errs.full_name = 'الاسم يجب أن يتكون من حرفين على الأقل وبدون رموز.';
    }
    
    const phoneErr = getSyrianPhoneError(editForm.phone, true);
    if (phoneErr) {
      errs.phone = phoneErr;
    }
    
    if (!editForm.license_number.trim()) {
      errs.license_number = 'يرجى إدخال رقم الرخصة.';
    }
    
    setEditFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitCreate() {
    if (!companyId) return;
    if (!validateForm()) return;
    setActionError(null);
    try {
      await createUserViaEdge({ ...form, role: 'driver', company_id: companyId });
      await queryClient.invalidateQueries({ queryKey: ['drivers', companyId] });
      setOpen(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : messages.common.unexpectedError);
    }
  }

  function openAddModal() {
    setFormErrors({});
    setActionError(null);
    setForm({ full_name: '', email: '', phone: '', password: '12345678', license_number: '' });
    setOpen(true);
  }

  function openEdit(driver: any) {
    setActionError(null);
    setEditFormErrors({});
    setEditing(driver);
    setEditForm({
      full_name: driver.user?.full_name || '',
      phone: driver.user?.phone || '',
      license_number: driver.license_number || '',
      status: driver.status || 'active',
    });
  }

  function submitEdit() {
    if (!validateEditForm()) return;
    saveDriverMutation.mutate();
  }


  return (
    <div>
      <PageHeader
        title={messages.company.drivers.title}
        subtitle={messages.company.drivers.subtitle}
        actions={
          <Button onClick={openAddModal}>
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

      {pendingSuspend ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <span className="mt-0.5 shrink-0 text-lg">⏳</span>
          <div className="flex-1">
            <p className="font-semibold">{messages.company.drivers.pendingSuspendTitle}</p>
            <p className="mt-0.5">
              {messages.company.drivers.pendingSuspendMsg
                .replace('{name}', pendingSuspend.driverName)
                .replace('{time}', pendingSuspend.arrivalTime ? formatDateTime(pendingSuspend.arrivalTime) : messages.company.drivers.pendingSuspendUnknownTime)}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            onClick={() => setPendingSuspend(null)}
          >
            ✕
          </button>
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
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: sanitizeName(e.target.value) })} />
            {formErrors.full_name && <p className="text-xs text-red-500">{formErrors.full_name}</p>}
          </Field>
          <Field label={messages.common.email}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
          </Field>
          <Field label={messages.common.phone}>
            <Input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizePositiveDigits(e.target.value) })} />
            {formErrors.phone && <p className="text-xs text-red-500">{formErrors.phone}</p>}
          </Field>
          <Field label={messages.company.drivers.licenseNumber}>
            <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
            {formErrors.license_number && <p className="text-xs text-red-500">{formErrors.license_number}</p>}
          </Field>
          <Button onClick={submitCreate}>{messages.company.drivers.createAndAssign}</Button>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => !saveDriverMutation.isPending && setEditing(null)} title={messages.company.drivers.editDriver}>
        {editing ? (
          <div className="grid gap-4">
            <Field label={messages.common.name}>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: sanitizeName(e.target.value) })} />
              {editFormErrors.full_name && <p className="text-xs text-red-500">{editFormErrors.full_name}</p>}
            </Field>
            <Field label={messages.common.phone}>
              <Input inputMode="numeric" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: sanitizePositiveDigits(e.target.value) })} />
              {editFormErrors.phone && <p className="text-xs text-red-500">{editFormErrors.phone}</p>}
            </Field>
            <Field label={messages.company.drivers.licenseNumber}>
              <Input value={editForm.license_number} onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })} />
              {editFormErrors.license_number && <p className="text-xs text-red-500">{editFormErrors.license_number}</p>}
            </Field>
            <Field label={messages.common.status || 'الحالة'}>
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">{messages.status.active}</option>
                <option value="suspended">{messages.status.suspended}</option>
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={saveDriverMutation.isPending}>
                {messages.common.close}
              </Button>
              <Button type="button" onClick={submitEdit} disabled={saveDriverMutation.isPending}>
                {messages.common.save}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
