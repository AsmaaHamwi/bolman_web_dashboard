import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Status';
import { DataTable, Td } from '../../components/ui/Table';
import { companyPermissionKeys } from '../../config/permissions';
import { useAuth } from '../auth/AuthProvider';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useI18n } from '../../hooks/useI18n';
import {
  createCompanyStaffMember,
  defaultCompanyStaffPermissions,
  listCompanyStaff,
  mapCompanyStaffPermissions,
  updateCompanyStaffPermissions,
  updateUserStatus,
  type CompanyStaffPermissions,
  type CompanyStaffRecord,
} from '../../services/staff.service';

type FeedbackTone = 'success' | 'error';

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '12345678',
};

export function CompanyStaffPage() {
  const { profile } = useAuth();
  const { messages } = useI18n();
  const queryClient = useQueryClient();
  const company = useCompanyContext();
  const companyId = company.data;
  const canManageStaff = profile?.role === 'company_owner';
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<CompanyStaffRecord | null>(null);
  const [form, setForm] = useState(initialForm);
  const [createPermissions, setCreatePermissions] = useState<CompanyStaffPermissions>(defaultCompanyStaffPermissions);
  const [editPermissions, setEditPermissions] = useState<CompanyStaffPermissions>(defaultCompanyStaffPermissions);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);

  const staffQuery = useQuery({
    queryKey: ['company-staff', companyId],
    queryFn: () => listCompanyStaff(companyId!),
    enabled: canManageStaff && !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCompanyStaffMember({
        company_id: companyId!,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        permissions: createPermissions,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-staff', companyId] });
      setFeedback({ tone: 'success', message: messages.company.staff.createSuccess });
      setOpenCreate(false);
      setForm(initialForm);
      setCreatePermissions(defaultCompanyStaffPermissions);
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: () => updateCompanyStaffPermissions(editing!.user_id, editing!.company_id, editPermissions),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-staff', companyId] });
      setFeedback({ tone: 'success', message: messages.company.staff.updateSuccess });
      setEditing(null);
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) => updateUserStatus(userId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-staff', companyId] });
      setFeedback({ tone: 'success', message: messages.company.staff.statusUpdated });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  function openEdit(record: CompanyStaffRecord) {
    setEditing(record);
    setEditPermissions(mapCompanyStaffPermissions(record));
    setFeedback(null);
  }

  if (company.isPending) {
    return <div className="grid min-h-[40vh] place-items-center text-bolman-purple">{messages.common.loading}</div>;
  }

  if (!companyId) {
    return (
      <Card>
        <CardTitle>{messages.company.staff.title}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.company.staff.companyNotFound}</p>
      </Card>
    );
  }

  if (!canManageStaff) {
    return (
      <Card>
        <CardTitle>{messages.company.staff.title}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.company.staff.noPermission}</p>
      </Card>
    );
  }

  const rows = staffQuery.data ?? [];
  const permissionLabels = messages.company.staff.permissionLabels as Record<string, string>;

  return (
    <div>
      <PageHeader
        title={messages.company.staff.title}
        subtitle={messages.company.staff.subtitle}
        actions={
          <Button onClick={() => setOpenCreate(true)}>
            <Plus size={18} />
            {messages.company.staff.addButton}
          </Button>
        }
      />

      {feedback ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'}`}>
          {feedback.message}
        </div>
      ) : null}

      <DataTable columns={messages.company.staff.table as unknown as string[]} loading={staffQuery.isPending} empty={!staffQuery.isPending && !rows.length}>
        {rows.map((record) => (
          <tr key={record.user_id}>
            <Td className="font-bold">{record.user?.full_name}</Td>
            <Td>{record.user?.email}</Td>
            <Td><StatusBadge value={record.user?.status} /></Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                {companyPermissionKeys.filter((permission) => record[permission]).map((permission) => (
                  <Badge key={permission} tone="mint">{permissionLabels[permission] ?? permission}</Badge>
                ))}
              </div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openEdit(record)}>
                  <Pencil size={16} />
                  {messages.company.staff.editButton}
                </Button>
                <Button
                  variant={record.user?.status === 'active' ? 'danger' : 'mint'}
                  onClick={() => toggleStatusMutation.mutate({ userId: record.user_id, status: record.user?.status === 'active' ? 'suspended' : 'active' })}
                >
                  {record.user?.status === 'active' ? messages.common.disable : messages.common.enable}
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>

      <Modal open={openCreate} onClose={() => !createMutation.isPending && setOpenCreate(false)} title={messages.company.staff.modalTitle}>
        <div className="grid gap-4">
          <Field label={messages.common.name}>
            <Input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
          </Field>
          <Field label={messages.common.email}>
            <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label={messages.common.phone}>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label={messages.company.staff.temporaryPassword}>
            <Input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </Field>
          <PermissionChecklist
            title={messages.company.staff.permissionsTitle}
            labels={permissionLabels}
            permissions={createPermissions}
            onToggle={(permission) => setCreatePermissions((state) => ({ ...state, [permission]: !state[permission] }))}
          />
          <p className="text-xs text-amber-800 dark:text-amber-200">{messages.company.staff.walletPermissionPatchHint}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenCreate(false)} disabled={createMutation.isPending}>
              {messages.common.close}
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? messages.common.loading : messages.common.create}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => !updatePermissionsMutation.isPending && setEditing(null)} title={messages.company.staff.editModalTitle}>
        <div className="grid gap-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-bolman-surfaceDark dark:text-slate-300">
            <div className="font-bold text-slate-900 dark:text-white">{editing?.user?.full_name}</div>
            <div>{editing?.user?.email}</div>
          </div>
          <PermissionChecklist
            title={messages.company.staff.permissionsTitle}
            labels={permissionLabels}
            permissions={editPermissions}
            onToggle={(permission) => setEditPermissions((state) => ({ ...state, [permission]: !state[permission] }))}
          />
          <p className="text-xs text-amber-800 dark:text-amber-200">{messages.company.staff.walletPermissionPatchHint}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updatePermissionsMutation.isPending}>
              {messages.common.close}
            </Button>
            <Button onClick={() => updatePermissionsMutation.mutate()} disabled={updatePermissionsMutation.isPending}>
              {updatePermissionsMutation.isPending ? messages.common.loading : messages.common.save}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PermissionChecklist({
  title,
  labels,
  permissions,
  onToggle,
}: {
  title: string;
  labels: Record<string, string>;
  permissions: CompanyStaffPermissions;
  onToggle: (permission: keyof CompanyStaffPermissions) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {companyPermissionKeys.map((permission) => (
          <label key={permission} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-bolman-borderDark">
            <input type="checkbox" checked={permissions[permission]} onChange={() => onToggle(permission)} />
            <span>{labels[permission]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
