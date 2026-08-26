import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, PasswordInput } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { createCompanyWithOwner, listCompanies, updateCompany } from '../../services/company.service';
import { isValidName, isValidSyrianPhone, sanitizeName, sanitizePositiveDigits } from '../../utils/validation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type FormState = {
  company: { name: string; phone: string; email: string };
  owner: { full_name: string; phone: string; email: string; password: string };
};

type FieldKey = 'companyName' | 'companyPhone' | 'companyEmail' | 'ownerName' | 'ownerPhone' | 'ownerEmail' | 'ownerPassword';

const emptyForm: FormState = {
  company: { name: '', phone: '', email: '' },
  owner: { full_name: '', phone: '', email: '', password: '' },
};

const errorInputClass = 'border-red-400 focus:border-red-400 focus:ring-red-500/10 dark:border-red-500/60';

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
            <Td>{company.email}</Td>
            <Td>{company.owner?.full_name || company.owner_user_id}</Td>
            <Td><StatusBadge value={company.status} /></Td>
            <Td>
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
          <Field label={messages.common.phone}>
            <Input
              className={errors.companyPhone ? errorInputClass : undefined}
              inputMode="numeric"
              value={form.company.phone}
              aria-invalid={!!errors.companyPhone}
              onChange={(e) => setCompanyField('phone', sanitizePositiveDigits(e.target.value), 'companyPhone')}
            />
            {errors.companyPhone && <p className="text-xs text-red-500">{errors.companyPhone}</p>}
          </Field>
          <Field label={messages.common.email}>
            <Input
              className={errors.companyEmail ? errorInputClass : undefined}
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
          <Field label={messages.system.companies.ownerEmail}>
            <Input
              className={errors.ownerEmail ? errorInputClass : undefined}
              type="email"
              value={form.owner.email}
              aria-invalid={!!errors.ownerEmail}
              onChange={(e) => setOwnerField('email', e.target.value, 'ownerEmail')}
            />
            {errors.ownerEmail && <p className="text-xs text-red-500">{errors.ownerEmail}</p>}
          </Field>
          <Field label={messages.system.companies.ownerPassword}>
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
    </div>
  );
}
