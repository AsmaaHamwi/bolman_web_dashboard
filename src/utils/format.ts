import { getIntlLocale } from '../i18n';
import { useUiStore } from '../stores/useUiStore';

function getCurrentLocale() {
  return useUiStore.getState().locale;
}

export function formatMoney(value?: number | string | null) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(getIntlLocale(getCurrentLocale()), {
    style: 'currency',
    currency: 'SYP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat(getIntlLocale(getCurrentLocale()), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
