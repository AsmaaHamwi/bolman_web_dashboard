import { getDirection, getMessages } from '../i18n';
import { useUiStore } from '../stores/useUiStore';

export function useI18n() {
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);
  const messages = getMessages(locale);

  return {
    locale,
    messages,
    dir: getDirection(locale),
    isArabic: locale === 'ar',
    setLocale,
    toggleLocale: () => setLocale(locale === 'ar' ? 'en' : 'ar'),
  };
}
