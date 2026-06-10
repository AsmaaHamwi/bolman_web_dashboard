import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ClipboardList, Users, WalletCards } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { Card, CardTitle } from '../../components/ui/Card';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { getCompanyKpis } from '../../services/report.service';
import { formatMoney } from '../../utils/format';

export function CompanyReportsPage() {
  const { data: companyId } = useCompanyContext();
  const { data } = useQuery({ queryKey: ['company-kpis', companyId], queryFn: () => getCompanyKpis(companyId), enabled: !!companyId });
  const { messages } = useI18n();

  return (
    <div>
      <PageHeader title={messages.company.reports.title} subtitle={messages.company.reports.subtitle} />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title={messages.common.trips} value={data?.trips ?? 0} icon={CalendarDays} />
        <KpiCard title={messages.common.bookings} value={data?.bookings ?? 0} icon={ClipboardList} />
        <KpiCard title={messages.common.passengers} value={data?.passengers ?? 0} icon={Users} />
        <KpiCard title={messages.common.revenue} value={formatMoney(data?.revenue)} icon={WalletCards} />
      </div>
      <Card className="mt-6">
        <CardTitle>{messages.company.reports.noteTitle}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.company.reports.noteBody}</p>
      </Card>
    </div>
  );
}
