import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Building2, Bus, ClipboardList, QrCode, Users, WalletCards } from 'lucide-react';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { useI18n } from '../../hooks/useI18n';
import { getSystemKpis } from '../../services/report.service';
import { formatMoney } from '../../utils/format';

export function SystemOverviewPage() {
  const { data } = useQuery({ queryKey: ['system-kpis'], queryFn: getSystemKpis });
  const { messages } = useI18n();

  const chart = messages.dashboard.systemOverview.weekDays.map((day, index) => ({
    n: day,
    v: [12, 18, 15, 26, 22, 34, 28][index],
  }));

  return (
    <div>
      <PageHeader title={messages.dashboard.systemOverview.title} subtitle={messages.dashboard.systemOverview.subtitle} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title={messages.layout.navigation.companies} value={data?.companies ?? 0} icon={Building2} />
        <KpiCard title={messages.common.users} value={data?.users ?? 0} icon={Users} />
        <KpiCard title={messages.common.trips} value={data?.trips ?? 0} icon={Bus} />
        <KpiCard title={messages.common.bookings} value={data?.bookings ?? 0} icon={ClipboardList} />
        <KpiCard title={messages.common.revenue} value={formatMoney(data?.revenue)} icon={WalletCards} />
        <KpiCard title="QR" value={data?.scans ?? 0} icon={QrCode} />
      </div>
      <Card className="mt-6">
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
