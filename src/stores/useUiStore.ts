import { create } from 'zustand';
import { getDirection, type Locale } from '../i18n';

type ThemeMode = 'light' | 'dark';

interface UiStore {
  locale: Locale;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof localStorage === 'undefined') return 'light';
  return (localStorage.getItem('bolman-theme') as ThemeMode) || 'light';
};

const getInitialLocale = (): Locale => {
  if (typeof localStorage === 'undefined') return 'ar';
  return (localStorage.getItem('bolman-locale') as Locale) || 'ar';
};

export const useUiStore = create<UiStore>((set, get) => ({
  locale: getInitialLocale(),
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  setLocale: (locale) => {
    localStorage.setItem('bolman-locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
    set({ locale });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bolman-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    set({ theme: next });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

export function initUiPreferences() {
  const theme = getInitialTheme();
  const locale = getInitialLocale();
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.lang = locale;
  document.documentElement.dir = getDirection(locale);
}
