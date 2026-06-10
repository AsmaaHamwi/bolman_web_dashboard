import { useQuery } from '@tanstack/react-query';
import { Building2, ClipboardList, QrCode, WalletCards } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { Card, CardTitle } from '../../components/ui/Card';
import { useI18n } from '../../hooks/useI18n';
import { getSystemKpis } from '../../services/report.service';
import { formatMoney } from '../../utils/format';

export function SystemReportsPage() {
  const { data } = useQuery({ queryKey: ['system-kpis'], queryFn: getSystemKpis });
  const { messages } = useI18n();

  return (
    <div>
      <PageHeader title={messages.system.reports.title} subtitle={messages.system.reports.subtitle} />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title={messages.layout.navigation.companies} value={data?.companies ?? 0} icon={Building2} />
        <KpiCard title={messages.common.bookings} value={data?.bookings ?? 0} icon={ClipboardList} />
        <KpiCard title={messages.common.revenue} value={formatMoney(data?.revenue)} icon={WalletCards} />
        <KpiCard title={messages.system.reports.scans} value={data?.scans ?? 0} icon={QrCode} />
      </div>
      <Card className="mt-6">
        <CardTitle>{messages.system.reports.noteTitle}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.system.reports.noteBody}</p>
      </Card>
    </div>
  );
}
