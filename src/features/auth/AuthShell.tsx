import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useUiStore } from '../../stores/useUiStore';
import { useI18n } from '../../hooks/useI18n';

/**
 * Page frame shared by the public auth screens outside the dashboard layout: same gradient and
 * card as LoginPage, plus the language/theme toggles those screens have no header to host.
 */
export function AuthShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { theme, toggleTheme } = useUiStore();
  const { locale, toggleLocale } = useI18n();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(184,176,255,.25),transparent_28%),linear-gradient(135deg,#f7f7fb,#ecebff)] p-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(108,99,255,.25),transparent_25%),linear-gradient(135deg,#12131A,#1B1D27)]">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-md items-center justify-center">
        <Card className="bolman-fade-up w-full p-8">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {icon && <div className="mb-3 text-bolman-purple">{icon}</div>}
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="secondary" onClick={toggleLocale}>
                {locale.toUpperCase()}
              </Button>
              <Button type="button" variant="secondary" onClick={toggleTheme}>
                {theme === 'dark' ? '☀️' : '🌙'}
              </Button>
            </div>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

export function AuthAlert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  return <div className={`rounded-2xl p-3 text-sm ${styles}`}>{children}</div>;
}
