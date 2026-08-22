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

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const locale = getIntlLocale(getCurrentLocale());
    const dateStr = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    const timeStr = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(d);
    return `${dateStr} • ${timeStr}`;
  } catch {
    return value;
  }
}

export function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat(getIntlLocale(getCurrentLocale()), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatTime(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat(getIntlLocale(getCurrentLocale()), {
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTripDuration(departure?: string | null, arrival?: string | null) {
  if (!departure || !arrival) return '';
  const dep = new Date(departure).getTime();
  const arr = new Date(arrival).getTime();
  if (isNaN(dep) || isNaN(arr) || arr <= dep) return '';
  const diffMinutes = Math.round((arr - dep) / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const isAr = getCurrentLocale() === 'ar';
  if (hours > 0 && minutes > 0) {
    return isAr ? `${hours} س ${minutes} د` : `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return isAr ? `${hours} س` : `${hours}h`;
  }
  return isAr ? `${minutes} د` : `${minutes}m`;
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

