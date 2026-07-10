import { useQuery } from '@tanstack/react-query';
import { Bus, CalendarDays, ClipboardList, Users, WalletCards } from 'lucide-react';
import { Star } from 'lucide-react';
import { StaggerChildren, StaggerItem } from '../../components/animations/StaggerChildren';
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
      <StaggerChildren className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StaggerItem><KpiCard title={messages.common.trips} value={data?.trips ?? 0} icon={CalendarDays} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.active} value={data?.activeTrips ?? 0} icon={Bus} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.bookings} value={data?.bookings ?? 0} icon={ClipboardList} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.passengers} value={data?.passengers ?? 0} icon={Users} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.revenue} value={formatMoney(data?.revenue)} icon={WalletCards} /></StaggerItem>
        <StaggerItem>
          <KpiCard
            title={messages.common.avgRating}
            value={data?.avgRating != null ? data.avgRating.toFixed(1) : '—'}
            icon={Star}
          />
        </StaggerItem>
      </StaggerChildren>
    </div>
  );
}
