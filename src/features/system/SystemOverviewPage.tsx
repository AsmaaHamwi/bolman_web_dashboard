import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Building2, Bus, ClipboardList, QrCode, Users, WalletCards } from 'lucide-react';
import { StaggerChildren, StaggerItem } from '../../components/animations/StaggerChildren';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { useI18n } from '../../hooks/useI18n';
import { liveDashboardQueryOptions } from '../../lib/queryClient';
import { getSystemKpis } from '../../services/report.service';
import { formatMoney } from '../../utils/format';

export function SystemOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['system-kpis'],
    queryFn: getSystemKpis,
    ...liveDashboardQueryOptions,
  });
  const { messages } = useI18n();

  const chart = messages.dashboard.systemOverview.weekDays.map((day, index) => ({
    n: day,
    v: [12, 18, 15, 26, 22, 34, 28][index],
  }));

  return (
    <div>
      <PageHeader title={messages.dashboard.systemOverview.title} subtitle={messages.dashboard.systemOverview.subtitle} />
      <StaggerChildren className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StaggerItem><KpiCard title={messages.layout.navigation.companies} value={data?.companies ?? 0} isLoading={isLoading} icon={Building2} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.users} value={data?.users ?? 0} isLoading={isLoading} icon={Users} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.trips} value={data?.trips ?? 0} isLoading={isLoading} icon={Bus} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.bookings} value={data?.bookings ?? 0} isLoading={isLoading} icon={ClipboardList} /></StaggerItem>
        <StaggerItem><KpiCard title={messages.common.revenue} value={formatMoney(data?.revenue)} isLoading={isLoading} icon={WalletCards} /></StaggerItem>
        <StaggerItem><KpiCard title="QR" value={data?.scans ?? 0} isLoading={isLoading} icon={QrCode} /></StaggerItem>
      </StaggerChildren>
      <Card className="bolman-fade-up mt-6">
        <CardTitle>{messages.dashboard.systemOverview.weeklyActivity}</CardTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={chart}>
              <XAxis dataKey="n" />
              <Tooltip />
              <Area type="monotone" dataKey="v" stroke="#6C63FF" fill="#6C63FF" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
