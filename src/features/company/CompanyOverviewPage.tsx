import { useQuery } from '@tanstack/react-query';
import { Bus, CalendarDays, ClipboardList, Users, WalletCards } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { getCompanyKpis } from '../../services/report.service';
import { formatMoney } from '../../utils/format';

export function CompanyOverviewPage() {
  const { data: companyId } = useCompanyContext();
  const { data } = useQuery({ queryKey: ['company-kpis', companyId], queryFn: () => getCompanyKpis(companyId), enabled: !!companyId });
  const { messages } = useI18n();

  return (
    <div>
      <PageHeader title={messages.company.overview.title} subtitle={messages.company.overview.subtitle} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title={messages.common.trips} value={data?.trips ?? 0} icon={CalendarDays} />
        <KpiCard title={messages.common.active} value={data?.activeTrips ?? 0} icon={Bus} />
        <KpiCard title={messages.common.bookings} value={data?.bookings ?? 0} icon={ClipboardList} />
        <KpiCard title={messages.common.passengers} value={data?.passengers ?? 0} icon={Users} />
        <KpiCard title={messages.common.revenue} value={formatMoney(data?.revenue)} icon={WalletCards} />
      </div>
    </div>
  );
}
