import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Input';
import { systemPermissionKeys } from '../../config/permissions';
import { useAuth } from '../auth/AuthProvider';
import { useSystemStaffPermissions } from '../../hooks/usePermissions';
import { useI18n } from '../../hooks/useI18n';
import {
  createSystemStaffMember,
  defaultSystemStaffPermissions,
  listSystemStaff,
  mapSystemStaffPermissions,
  updateSystemStaffPermissions,
  updateUserStatus,
  type SystemStaffPermissions,
  type SystemStaffRecord,
} from '../../services/staff.service';

export function SystemStaffPage() {
  const { profile } = useAuth();
  const { messages } = useI18n();
  const queryClient = useQueryClient();
  const myPermissions = useSystemStaffPermissions();
  const canManageStaff = profile?.role === 'super_admin' || !!myPermissions.data?.can_manage_system_staff;
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const { data = [], isPending } = useQuery({
    queryKey: ['system-staff'],
    queryFn: listSystemStaff,
    enabled: canManageStaff,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemStaffRecord | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', password: '12345678', phone: '' });
  const [createPermissions, setCreatePermissions] = useState<SystemStaffPermissions>(defaultSystemStaffPermissions);
  const [editPermissions, setEditPermissions] = useState<SystemStaffPermissions>(defaultSystemStaffPermissions);

  const createMutation = useMutation({
    mutationFn: () =>
      createSystemStaffMember({
        ...form,
        permissions: createPermissions,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['system-staff'] });
      setOpen(false);
      setForm({ full_name: '', email: '', password: '12345678', phone: '' });
      setCreatePermissions(defaultSystemStaffPermissions);
      setFeedback({ tone: 'success', message: messages.system.staff.createSuccess });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: () => updateSystemStaffPermissions(editing!.user_id, editPermissions),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['system-staff'] });
      setEditing(null);
      setFeedback({ tone: 'success', message: messages.system.staff.updateSuccess });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) => updateUserStatus(userId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['system-staff'] });
      setFeedback({ tone: 'success', message: messages.system.staff.statusUpdated });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  function openEdit(record: SystemStaffRecord) {
    setEditing(record);
    setEditPermissions(mapSystemStaffPermissions(record));
    setFeedback(null);
  }

  if (profile?.role === 'system_staff' && myPermissions.isPending) {
    return <div className="grid min-h-[40vh] place-items-center text-bolman-purple">{messages.common.loading}</div>;
  }

  if (!canManageStaff) {
    return (
      <Card>
        <CardTitle>{messages.system.staff.title}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.system.staff.noPermission}</p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title={messages.system.staff.title}
        subtitle={messages.system.staff.subtitle}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} />
            {messages.system.staff.addButton}
          </Button>
        }
      />

      {feedback ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'}`}>
          {feedback.message}
        </div>
      ) : null}

      <DataTable columns={messages.system.staff.table as unknown as string[]} loading={isPending} empty={!isPending && !data.length}>
        {data.map((permission: any) => (
          <tr key={permission.user_id}>
            <Td className="font-bold">{permission.user?.full_name}</Td>
            <Td>{permission.user?.email}</Td>
            <Td><StatusBadge value={permission.user?.status} /></Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                {systemPermissionKeys.filter((key) => permission[key]).map((key) => (
                  <Badge key={key} tone="purple">{messages.system.staff.permissionLabels[key]}</Badge>
                ))}
              </div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openEdit(permission)}>
                  <Pencil size={16} />
                  {messages.system.staff.editButton}
                </Button>
                <Button
                  variant={permission.user?.status === 'active' ? 'danger' : 'mint'}
                  onClick={() => toggleStatusMutation.mutate({ userId: permission.user_id, status: permission.user?.status === 'active' ? 'suspended' : 'active' })}
                >
                  {permission.user?.status === 'active' ? messages.common.disable : messages.common.enable}
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
      <Modal open={open} onClose={() => setOpen(false)} title={messages.system.staff.modalTitle}>
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
          <Field label={messages.system.staff.temporaryPassword}>
            <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <PermissionChecklist
            title={messages.system.staff.permissionsTitle}
            labels={messages.system.staff.permissionLabels}
            permissions={createPermissions}
            onToggle={(permission) => setCreatePermissions((state) => ({ ...state, [permission]: !state[permission] }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
              {messages.common.close}
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? messages.common.loading : messages.common.create}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={messages.system.staff.editModalTitle}>
        <div className="grid gap-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-bolman-surfaceDark dark:text-slate-300">
            <div className="font-bold text-slate-900 dark:text-white">{editing?.user?.full_name}</div>
            <div>{editing?.user?.email}</div>
          </div>
          <PermissionChecklist
            title={messages.system.staff.permissionsTitle}
            labels={messages.system.staff.permissionLabels}
            permissions={editPermissions}
            onToggle={(permission) => setEditPermissions((state) => ({ ...state, [permission]: !state[permission] }))}
          />
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
  permissions: SystemStaffPermissions;
  onToggle: (permission: keyof SystemStaffPermissions) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {systemPermissionKeys.map((permission) => (
          <label key={permission} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-bolman-borderDark">
            <input type="checkbox" checked={permissions[permission]} onChange={() => onToggle(permission)} />
            <span>{labels[permission]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
