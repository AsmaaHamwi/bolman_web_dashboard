import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  BarChart3,
  Building2,
  ClipboardList,
  QrCode,
  Route as RouteIcon,
  Star,
  Trophy,
  Users,
  WalletCards,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { Card, CardTitle } from '../../components/ui/Card';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { useI18n } from '../../hooks/useI18n';
import { liveDashboardQueryOptions } from '../../lib/queryClient';
import { getSystemReportsData } from '../../services/report.service';
import { formatMoney } from '../../utils/format';

export function SystemReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['system-reports-data'],
    queryFn: getSystemReportsData,
    ...liveDashboardQueryOptions,
  });
  const { messages, locale } = useI18n();

  const companies = data?.companies ?? [];
  const totals = data?.totals;
  const topByRevenue = data?.topByRevenue ?? null;
  const topByBookings = data?.topByBookings ?? null;

  const chartData = companies.map((c) => ({ name: c.name, revenue: c.revenue }));

  return (
    <div>
      <PageHeader title={messages.system.reports.title} subtitle={messages.system.reports.subtitle} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard title={messages.layout.navigation.companies} value={totals?.companies ?? 0} isLoading={isLoading} icon={Building2} />
        <KpiCard title={messages.system.reports.totalTrips} value={totals?.trips ?? 0} isLoading={isLoading} icon={RouteIcon} />
        <KpiCard title={messages.common.bookings} value={totals?.bookings ?? 0} isLoading={isLoading} icon={ClipboardList} />
        <KpiCard title={messages.system.reports.totalPassengers} value={totals?.passengers ?? 0} isLoading={isLoading} icon={Users} />
        <KpiCard title={messages.common.revenue} value={formatMoney(totals?.revenue)} isLoading={isLoading} icon={WalletCards} />
        <KpiCard title={messages.system.reports.scans} value={totals?.scans ?? 0} isLoading={isLoading} icon={QrCode} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
              <Trophy size={20} />
            </div>
            <CardTitle>{messages.system.reports.topByRevenueTitle}</CardTitle>
          </div>
          {isLoading ? (
            <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-bolman-surfaceDark" />
          ) : topByRevenue ? (
            <div className="mt-4">
              <p className="text-lg font-black text-slate-950 dark:text-white">{topByRevenue.name}</p>
              <p className="mt-1 text-2xl font-black text-bolman-purple">{formatMoney(topByRevenue.revenue)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {topByRevenue.bookings} {locale === 'ar' ? 'حجز' : 'bookings'} · {topByRevenue.trips} {locale === 'ar' ? 'رحلة' : 'trips'}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{messages.system.reports.noCompanies}</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Trophy size={20} />
            </div>
            <CardTitle>{messages.system.reports.topByBookingsTitle}</CardTitle>
          </div>
          {isLoading ? (
            <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-bolman-surfaceDark" />
          ) : topByBookings ? (
            <div className="mt-4">
              <p className="text-lg font-black text-slate-950 dark:text-white">{topByBookings.name}</p>
              <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {topByBookings.bookings} {locale === 'ar' ? 'حجز' : 'bookings'}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatMoney(topByBookings.revenue)} · {topByBookings.passengers} {locale === 'ar' ? 'راكب' : 'passengers'}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{messages.system.reports.noCompanies}</p>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-bolman-purple/10 text-bolman-purple">
            <BarChart3 size={20} />
          </div>
          <CardTitle>{messages.system.reports.revenueByCompanyTitle}</CardTitle>
        </div>

        <div className="mt-6 h-72 w-full">
          {isLoading ? (
            <div className="flex h-full w-full items-end justify-between gap-3 px-6 pb-6 pt-8">
              {[55, 80, 45, 90, 65, 35, 75, 50].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-bolman-purple/15 via-bolman-purple/30 to-bolman-purple/50 animate-pulse transition-all duration-700"
                    style={{ height: `${h}%`, animationDelay: `${i * 120}ms`, animationDuration: '1.4s' }}
                  />
                  <div className="h-3 w-10 rounded bg-slate-200/60 dark:bg-slate-700/50 animate-pulse" />
                </div>
              ))}
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <Building2 size={40} className="mb-2 opacity-40" />
              <p className="text-sm font-bold">{messages.system.reports.noCompanies}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={55}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(51, 65, 85, 0.5)',
                    borderRadius: '14px',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                  formatter={(value: any) => [formatMoney(Number(value)), messages.common.revenue]}
                />
                <Bar
                  dataKey="revenue"
                  fill="#6C63FF"
                  radius={[8, 8, 0, 0]}
                  barSize={32}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>{messages.system.reports.perCompanyTitle}</CardTitle>
          {!isLoading && (
            <span className="text-xs font-bold text-bolman-purple bg-bolman-purple/10 px-3 py-1 rounded-xl">
              {companies.length} {locale === 'ar' ? 'شركة' : 'companies'}
            </span>
          )}
        </div>

        <DataTable columns={messages.system.reports.table as unknown as string[]} loading={isLoading} empty={!isLoading && companies.length === 0}>
          {companies.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-bolman-surfaceDark/50 transition-colors">
              <Td className="font-bold text-bolman-purple">{c.name}</Td>
              <Td>
                <StatusBadge value={c.status} />
              </Td>
              <Td>{c.trips}</Td>
              <Td>{c.activeTrips}</Td>
              <Td>{c.bookings}</Td>
              <Td>{c.passengers}</Td>
              <Td className="font-bold">{formatMoney(c.revenue)}</Td>
              <Td>
                {c.avgRating != null ? (
                  <span className="flex items-center gap-1 font-semibold text-amber-500">
                    <Star size={14} fill="currentColor" />
                    {c.avgRating.toFixed(1)}
                  </span>
                ) : (
                  messages.system.reports.noRating
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
