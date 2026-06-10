import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { createCompanyWithOwner, listCompanies, updateCompany } from '../../services/company.service';

export function CompaniesPage() {
  const qc = useQueryClient();
  const { data = [], isPending } = useQuery({ queryKey: ['companies'], queryFn: listCompanies });
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    company: { name: '', phone: '', email: '' },
    owner: { full_name: '', phone: '', email: '', password: '12345678' },
  });

  const create = useMutation({
    mutationFn: createCompanyWithOwner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: any) => updateCompany(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  return (
    <div>
      <PageHeader
        title={messages.system.companies.title}
        subtitle={messages.system.companies.subtitle}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} />
            {messages.system.companies.addButton}
          </Button>
        }
      />
      <DataTable columns={messages.system.companies.table as unknown as string[]} loading={isPending} empty={!isPending && !data.length}>
        {data.map((company: any) => (
          <tr key={company.id}>
            <Td className="font-bold">{company.name}</Td>
            <Td>{company.phone}</Td>
            <Td>{company.email}</Td>
            <Td>{company.owner?.full_name || company.owner_user_id}</Td>
            <Td><StatusBadge value={company.status} /></Td>
            <Td>
              <Button
                variant="secondary"
                onClick={() =>
                  update.mutate({
                    id: company.id,
                    patch: { status: company.status === 'active' ? 'suspended' : 'active' },
                  })
                }
              >
                {company.status === 'active' ? messages.common.disable : messages.common.enable}
              </Button>
            </Td>
          </tr>
        ))}
      </DataTable>
      <Modal open={open} onClose={() => setOpen(false)} title={messages.system.companies.modalTitle}>
        <div className="grid gap-4">
          <Field label={messages.system.companies.companyName}>
            <Input value={form.company.name} onChange={(e) => setForm({ ...form, company: { ...form.company, name: e.target.value } })} />
          </Field>
          <Field label={messages.common.phone}>
            <Input value={form.company.phone} onChange={(e) => setForm({ ...form, company: { ...form.company, phone: e.target.value } })} />
          </Field>
          <Field label={messages.common.email}>
            <Input value={form.company.email} onChange={(e) => setForm({ ...form, company: { ...form.company, email: e.target.value } })} />
          </Field>
          <Field label={messages.system.companies.ownerName}>
            <Input value={form.owner.full_name} onChange={(e) => setForm({ ...form, owner: { ...form.owner, full_name: e.target.value } })} />
          </Field>
          <Field label={messages.system.companies.ownerPhone}>
            <Input value={form.owner.phone} onChange={(e) => setForm({ ...form, owner: { ...form.owner, phone: e.target.value } })} />
          </Field>
          <Field label={messages.system.companies.ownerEmail}>
            <Input value={form.owner.email} onChange={(e) => setForm({ ...form, owner: { ...form.owner, email: e.target.value } })} />
          </Field>
          <Field label={messages.system.companies.ownerPassword}>
            <Input type="password" value={form.owner.password} onChange={(e) => setForm({ ...form, owner: { ...form.owner, password: e.target.value } })} />
          </Field>
          <Button onClick={() => create.mutate({ company: { ...form.company, logo_url: null }, owner: form.owner })}>{messages.common.save}</Button>
        </div>
      </Modal>
    </div>
  );
}
