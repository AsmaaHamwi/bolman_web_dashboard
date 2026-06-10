import { ar } from './locales/ar';
import { en } from './locales/en';

export type Locale = 'ar' | 'en';

export const dictionaries = { ar, en } as const;

export type Messages = (typeof dictionaries)[Locale];

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export function getDirection(locale: Locale) {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function getIntlLocale(locale: Locale) {
  return locale === 'ar' ? 'ar-SY' : 'en-US';
}

export function translateStatus(value: string, locale: Locale) {
  return getMessages(locale).status[value as keyof Messages['status']] ?? value;
}

export function translateRole(value: string, locale: Locale) {
  return getMessages(locale).roles[value as keyof Messages['roles']] ?? value;
}
