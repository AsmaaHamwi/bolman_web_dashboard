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
  return locale === 'ar' ? 'ar-SY-u-nu-latn' : 'en-US';
}

export function translateStatus(value: string, locale: Locale) {
  return getMessages(locale).status[value as keyof Messages['status']] ?? value;
}

export function translateRole(value: string, locale: Locale) {
  return getMessages(locale).roles[value as keyof Messages['roles']] ?? value;
}

export function getWelcomeMessage(
  role: string | undefined,
  companyName: string | undefined | null,
  locale: Locale
): string {
  if (!role) {
    return locale === 'ar' ? 'مرحبًا بك' : 'Welcome';
  }

  const isArabic = locale === 'ar';

  if (role === 'company_owner' || role === 'company_staff') {
    if (isArabic) {
      const roleWord = role === 'company_owner' ? 'مالك' : 'موظف';
      if (companyName && companyName.trim()) {
        const cleaned = companyName.trim();
        const startsWithCompany = /^شركة\s+/i.test(cleaned) || cleaned === 'شركة';
        const formattedCompany = startsWithCompany ? cleaned : `شركة ${cleaned}`;
        return `مرحبًا بك ${roleWord} ${formattedCompany}`;
      } else {
        return `مرحبًا بك ${roleWord} الشركة`;
      }
    } else {
      const roleWord = role === 'company_owner' ? 'Owner' : 'Staff';
      if (companyName && companyName.trim()) {
        return `Welcome, ${roleWord} of ${companyName.trim()}`;
      } else {
        return `Welcome, Company ${roleWord}`;
      }
    }
  }

  const roleTranslation = translateRole(role, locale);
  return isArabic ? `مرحبًا بك ${roleTranslation}` : `Welcome, ${roleTranslation}`;
}

