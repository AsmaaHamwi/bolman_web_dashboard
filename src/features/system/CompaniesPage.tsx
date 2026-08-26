import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Info, Plus, Trash } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, PasswordInput } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { createCompanyWithOwner, deleteCompany, listCompanies, updateCompany } from '../../services/company.service';
import { isValidName, isValidSyrianPhone, sanitizeName, sanitizePositiveDigits } from '../../utils/validation';
import { formatDateTime } from '../../utils/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type FormState = {
  company: { name: string; phone: string; email: string };
  owner: { full_name: string; phone: string; email: string; password: string };
};

type FieldKey = 'companyName' | 'companyPhone' | 'companyEmail' | 'ownerName' | 'ownerPhone' | 'ownerEmail' | 'ownerPassword';

const emptyForm: FormState = {
  company: { name: '', phone: '', email: '' },
  owner: { full_name: '', phone: '', email: '', password: '12345678' },
};

const errorInputClass = '!border-red-400 focus:!border-red-400 focus:!ring-red-500/10 dark:!border-red-500/60';

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-bolman-borderDark">
      <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <dl className="grid gap-2.5">{children}</dl>
    </section>
  );
}

/** One label/value line; `value` falls back to `empty` when blank so rows never collapse. */
function DetailRow({ label, value, empty }: { label: string; value?: React.ReactNode; empty: string }) {
  const isBlank = value == null || value === '' || (typeof value === 'string' && !value.trim());
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-center sm:gap-4">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="break-all text-sm text-slate-800 dark:text-slate-100">{isBlank ? empty : value}</dd>
    </div>
  );
}

export function CompaniesPage() {
  const qc = useQueryClient();
  const { data = [], isPending } = useQuery({ queryKey: ['companies'], queryFn: listCompanies });
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function closeModal() {
    setOpen(false);
    setForm(emptyForm);
    setErrors({});
    setSubmitError(null);
  }

  const create = useMutation({
    mutationFn: createCompanyWithOwner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : messages.common.unexpectedError);
    },
  });

  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: ({ id, patch }: any) => updateCompany(id, patch),
    // keep the spinner until the refetched list reflects the new status
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['companies'] });
      setPendingStatusId(null);
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<any | null>(null);
  const dash = messages.system.companies.detailsEmpty;

  const remove = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : messages.common.unexpectedError);
    },
  });

  function openModal() {
    setForm(emptyForm);
    setErrors({});
    setSubmitError(null);
    setOpen(true);
  }

  /** Updates one company field and clears its error so the message disappears while typing. */
  function setCompanyField(field: keyof FormState['company'], value: string, errorKey: FieldKey) {
    setForm((state) => ({ ...state, company: { ...state.company, [field]: value } }));
    setErrors((state) => ({ ...state, [errorKey]: undefined }));
    setSubmitError(null);
  }

  function setOwnerField(field: keyof FormState['owner'], value: string, errorKey: FieldKey) {
    setForm((state) => ({ ...state, owner: { ...state.owner, [field]: value } }));
    setErrors((state) => ({ ...state, [errorKey]: undefined }));
    setSubmitError(null);
  }

  function validate(): boolean {
    const v = messages.common.validation;
    const next: Partial<Record<FieldKey, string>> = {};

    const companyName = form.company.name.trim();
    if (!companyName) next.companyName = v.required;
    else if (companyName.length < 2) next.companyName = v.companyNameTooShort;

    // Company phone/email are optional for the Edge Function, but must be well-formed when filled.
    if (form.company.phone.trim() && !isValidSyrianPhone(form.company.phone)) next.companyPhone = v.invalidPhone;
    if (form.company.email.trim() && !EMAIL_RE.test(form.company.email.trim())) next.companyEmail = messages.common.invalidEmail;

    const ownerName = form.owner.full_name.trim();
    if (!ownerName) next.ownerName = v.required;
    else if (!isValidName(ownerName)) next.ownerName = v.invalidName;

    if (form.owner.phone.trim() && !isValidSyrianPhone(form.owner.phone)) next.ownerPhone = v.invalidPhone;

    const ownerEmail = form.owner.email.trim();
    if (!ownerEmail) next.ownerEmail = v.required;
    else if (!EMAIL_RE.test(ownerEmail)) next.ownerEmail = messages.common.invalidEmail;

    if (!form.owner.password) next.ownerPassword = v.required;
    else if (form.owner.password.length < MIN_PASSWORD_LENGTH) next.ownerPassword = v.passwordTooShort;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      setSubmitError(messages.common.validation.fixFieldsBelow);
      return;
    }
    create.mutate({
      company: {
        name: form.company.name.trim(),
        phone: form.company.phone.trim() || undefined,
        email: form.company.email.trim() || undefined,
        logo_url: null,
      },
      owner: {
        full_name: form.owner.full_name.trim(),
        phone: form.owner.phone.trim() || undefined,
        email: form.owner.email.trim(),
        password: form.owner.password,
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={messages.system.companies.title}
        subtitle={messages.system.companies.subtitle}
        actions={
          <Button onClick={openModal}>
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
            {/* The owner's auth email — the one the company actually signs in with. The company's
                own `email` column is contact-only and lives in the details modal instead. */}
            <Td>{company.owner?.email || messages.system.companies.detailsEmpty}</Td>
            <Td>{company.owner?.full_name || company.owner_user_id}</Td>
            <Td><StatusBadge value={company.status} /></Td>
            <Td>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  loading={pendingStatusId === company.id}
                  disabled={pendingStatusId !== null}
                  onClick={() => {
                    setPendingStatusId(company.id);
                    update.mutate({
                      id: company.id,
                      patch: { status: company.status === 'active' ? 'suspended' : 'active' },
                    });
                  }}
                >
                  {company.status === 'active' ? messages.common.disable : messages.common.enable}
                </Button>
                <button
                  type="button"
                  title={messages.system.companies.detailsButton}
                  aria-label={messages.system.companies.detailsButton}
                  onClick={() => setDetailsTarget(company)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-bolman-purple hover:bg-bolman-purple/5 hover:text-bolman-purple dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200 dark:hover:border-bolman-purple/50 dark:hover:bg-bolman-purple/10 transition-all shadow-sm"
                >
                  <Info size={17} />
                </button>
                <button
                  type="button"
                  title={messages.system.companies.deleteButton}
                  aria-label={messages.system.companies.deleteButton}
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget({ id: company.id, name: company.name });
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200 dark:hover:border-red-500/50 dark:hover:bg-red-500/10 transition-all shadow-sm"
                >
                  <Trash size={17} />
                </button>
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
      <Modal open={open} onClose={closeModal} title={messages.system.companies.modalTitle}>
        <form className="grid gap-4" onSubmit={submit} noValidate>
          <Field label={messages.system.companies.companyName}>
            <Input
              className={errors.companyName ? errorInputClass : undefined}
              value={form.company.name}
              aria-invalid={!!errors.companyName}
              onChange={(e) => setCompanyField('name', e.target.value, 'companyName')}
            />
            {errors.companyName && <p className="text-xs text-red-500">{errors.companyName}</p>}
          </Field>
          <Field label={messages.system.companies.companyPhone}>
            <Input
              className={errors.companyPhone ? errorInputClass : undefined}
              inputMode="numeric"
              value={form.company.phone}
              aria-invalid={!!errors.companyPhone}
              onChange={(e) => setCompanyField('phone', sanitizePositiveDigits(e.target.value), 'companyPhone')}
            />
            {errors.companyPhone && <p className="text-xs text-red-500">{errors.companyPhone}</p>}
          </Field>
          <Field
            label={messages.system.companies.companyEmail}
            hint={messages.system.companies.companyEmailHint}
          >
            <Input
              className={errors.companyEmail ? errorInputClass : undefined}
              autoComplete="off"
              type="email"
              value={form.company.email}
              aria-invalid={!!errors.companyEmail}
              onChange={(e) => setCompanyField('email', e.target.value, 'companyEmail')}
            />
            {errors.companyEmail && <p className="text-xs text-red-500">{errors.companyEmail}</p>}
          </Field>
          <Field label={messages.system.companies.ownerName}>
            <Input
              className={errors.ownerName ? errorInputClass : undefined}
              value={form.owner.full_name}
              aria-invalid={!!errors.ownerName}
              onChange={(e) => setOwnerField('full_name', sanitizeName(e.target.value), 'ownerName')}
            />
            {errors.ownerName && <p className="text-xs text-red-500">{errors.ownerName}</p>}
          </Field>
          <Field label={messages.system.companies.ownerPhone}>
            <Input
              className={errors.ownerPhone ? errorInputClass : undefined}
              inputMode="numeric"
              value={form.owner.phone}
              aria-invalid={!!errors.ownerPhone}
              onChange={(e) => setOwnerField('phone', sanitizePositiveDigits(e.target.value), 'ownerPhone')}
            />
            {errors.ownerPhone && <p className="text-xs text-red-500">{errors.ownerPhone}</p>}
          </Field>
          <Field
            label={messages.system.companies.ownerEmail}
            hint={messages.system.companies.ownerEmailHint}
          >
            <Input
              className={errors.ownerEmail ? errorInputClass : undefined}
              autoComplete="off"
              type="email"
              value={form.owner.email}
              aria-invalid={!!errors.ownerEmail}
              onChange={(e) => setOwnerField('email', e.target.value, 'ownerEmail')}
            />
            {errors.ownerEmail && <p className="text-xs text-red-500">{errors.ownerEmail}</p>}
          </Field>
          <Field
            label={messages.system.companies.ownerPassword}
            hint={messages.system.companies.ownerPasswordHint}
          >
            <PasswordInput
              className={errors.ownerPassword ? errorInputClass : undefined}
              value={form.owner.password}
              autoComplete="new-password"
              showLabel={messages.common.showPassword}
              hideLabel={messages.common.hidePassword}
              aria-invalid={!!errors.ownerPassword}
              onChange={(e) => setOwnerField('password', e.target.value, 'ownerPassword')}
            />
            {errors.ownerPassword && <p className="text-xs text-red-500">{errors.ownerPassword}</p>}
          </Field>
          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {submitError}
            </div>
          )}
          <Button type="submit" loading={create.isPending}>{messages.common.save}</Button>
        </form>
      </Modal>
      <Modal
        open={!!detailsTarget}
        onClose={() => setDetailsTarget(null)}
        title={messages.system.companies.detailsTitle}
      >
        {detailsTarget && (
          <div className="grid gap-5">
            <DetailsSection title={messages.system.companies.detailsCompanySection}>
              <DetailRow label={messages.system.companies.companyName} value={detailsTarget.name} empty={dash} />
              <DetailRow label={messages.common.phone} value={detailsTarget.phone} empty={dash} />
              <DetailRow
                label={messages.system.companies.detailsContactEmail}
                value={detailsTarget.email}
                empty={dash}
              />
              <DetailRow
                label={messages.common.status}
                value={<StatusBadge value={detailsTarget.status} />}
                empty={dash}
              />
              <DetailRow
                label={messages.system.companies.detailsCreatedAt}
                value={detailsTarget.created_at ? formatDateTime(detailsTarget.created_at) : null}
                empty={dash}
              />
              <DetailRow
                label={messages.system.companies.detailsCompanyId}
                value={<span className="font-mono text-xs">{detailsTarget.id}</span>}
                empty={dash}
              />
            </DetailsSection>
            <DetailsSection title={messages.system.companies.detailsOwnerSection}>
              <DetailRow
                label={messages.system.companies.ownerName}
                value={detailsTarget.owner?.full_name}
                empty={dash}
              />
              <DetailRow
                label={messages.system.companies.detailsLoginEmail}
                value={detailsTarget.owner?.email}
                empty={dash}
              />
              <DetailRow
                label={messages.system.companies.ownerPhone}
                value={detailsTarget.owner?.phone}
                empty={dash}
              />
              <DetailRow
                label={messages.system.companies.ownerIdLabel}
                value={<span className="font-mono text-xs">{detailsTarget.owner_user_id}</span>}
                empty={dash}
              />
            </DetailsSection>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setDetailsTarget(null)}>
                {messages.common.close}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={!!deleteTarget}
        onClose={() => {
          if (remove.isPending) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        title={messages.system.companies.deleteTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {deleteTarget && messages.system.companies.deleteConfirm.replace('{{name}}', deleteTarget.name)}
          </p>
          {deleteError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={remove.isPending}>
              {messages.common.close}
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}
            >
              {messages.system.companies.deleteButton}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
