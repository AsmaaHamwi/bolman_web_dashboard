import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useUiStore } from '../../stores/useUiStore';
import { useI18n } from '../../hooks/useI18n';

export function SettingsPage() {
  const { theme, toggleTheme } = useUiStore();
  const { locale, messages, toggleLocale } = useI18n();

  return (
    <div>
      <PageHeader title={messages.settings.title} subtitle={messages.settings.subtitle} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{messages.settings.languageTitle}</CardTitle>
          <p className="my-3 text-sm text-slate-500 dark:text-slate-400">{messages.settings.languageDescription}</p>
          <Button onClick={toggleLocale}>{locale === 'ar' ? messages.settings.switchToEnglish : messages.settings.switchToArabic}</Button>
        </Card>
        <Card>
          <CardTitle>{messages.settings.themeTitle}</CardTitle>
          <p className="my-3 text-sm text-slate-500 dark:text-slate-400">{messages.settings.themeDescription}</p>
          <Button onClick={toggleTheme}>{theme === 'dark' ? messages.settings.enableLightTheme : messages.settings.enableDarkTheme}</Button>
        </Card>
      </div>
    </div>
  );
}
