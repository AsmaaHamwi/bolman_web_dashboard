import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  FileSpreadsheet,
  PieChart as PieIcon,
  Printer,
  Route as RouteIcon,
  Users,
  Wallet,
  WalletCards,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext, useCompanyProfile } from '../../hooks/useCompanyContext';
import { getCompanyReportsData } from '../../services/report.service';
import { formatDateTime, formatMoney } from '../../utils/format';

export function CompanyReportsPage() {
  const { data: companyId } = useCompanyContext();
  const companyProfile = useCompanyProfile(companyId);
  const { messages, locale } = useI18n();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const { data, isLoading } = useQuery({
    queryKey: ['company-reports-data', companyId, period, locale],
    queryFn: () => getCompanyReportsData(companyId, period, locale),
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const totalRev = data?.totalRevenue ?? 0;
  const totalBookings = data?.totalBookings ?? 0;
  const totalPassengers = data?.totalPassengers ?? 0;
  const avgPrice = data?.avgTicketPrice ?? 0;
  const occupancyRate = data?.occupancyRate ?? '0%';
  const routeData = data?.routeData ?? [];
  const paymentData = data?.paymentData ?? [];

  const companyName = companyProfile.data?.name || messages.common.appName;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 -mt-3 sm:-mt-5">
      {/* Official Printable Header (Visible only when printing) */}
      <div className="print-only mb-6 rounded-2xl border border-slate-300 p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{messages.company.reports.officialHeader}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {messages.common.appName} — {companyName}
            </p>
          </div>
          <div className="text-end text-xs text-slate-500">
            <p>{messages.company.reports.generatedAt}:</p>
            <p className="font-mono font-bold text-slate-800">{formatDateTime(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      <PageHeader
        title={messages.company.reports.title}
        subtitle={messages.company.reports.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-3 no-print">
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-bolman-borderDark dark:bg-bolman-cardDark">
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  period === 'month'
                    ? 'bg-bolman-purple text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                {messages.company.reports.currentMonth}
              </button>
              <button
                type="button"
                onClick={() => setPeriod('quarter')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  period === 'quarter'
                    ? 'bg-bolman-purple text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                {messages.company.reports.lastQuarter}
              </button>
              <button
                type="button"
                onClick={() => setPeriod('year')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  period === 'year'
                    ? 'bg-bolman-purple text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                {messages.company.reports.fullYear}
              </button>
            </div>

            <Button onClick={handlePrint} className="gap-2 shadow-glow">
              <Printer size={18} />
              {messages.company.reports.printReport}
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={messages.common.revenue} value={formatMoney(totalRev)} isLoading={isLoading} icon={WalletCards} />
        <KpiCard title={messages.company.reports.occupancyRate} value={occupancyRate} isLoading={isLoading} icon={Users} hint={occupancyRate !== '0%' ? 'معدل حقيقي' : undefined} />
        <KpiCard title={messages.company.reports.avgTicketPrice} value={formatMoney(avgPrice)} isLoading={isLoading} icon={Wallet} />
        <KpiCard title={messages.common.bookings} value={totalBookings} isLoading={isLoading} icon={FileSpreadsheet} />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Route Performance Bar Chart */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-bolman-purple/10 text-bolman-purple">
                <BarChart3 size={20} />
              </div>
              <CardTitle>{messages.company.reports.routesPerformanceTitle}</CardTitle>
            </div>
            {!isLoading && routeData.length > 0 && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {routeData.length} {locale === 'ar' ? 'مسارات' : 'routes'}
              </span>
            )}
          </div>

          <div className="mt-6 h-72 w-full">
            {isLoading ? (
              /* Animated Bars Skeleton Loader */
              <div className="flex h-full w-full items-end justify-between gap-3 px-6 pb-6 pt-8">
                {[55, 80, 45, 90, 65, 35, 75, 50].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                    <div
                      className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-bolman-purple/15 via-bolman-purple/30 to-bolman-purple/50 animate-pulse transition-all duration-700"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 120}ms`,
                        animationDuration: '1.4s',
                      }}
                    />
                    <div className="h-3 w-10 rounded bg-slate-200/60 dark:bg-slate-700/50 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : routeData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <RouteIcon size={40} className="mb-2 opacity-40" />
                <p className="text-sm font-bold">
                  {locale === 'ar' ? 'لا توجد مسارات مسجلة لهذه الشركة حالياً' : 'No routes registered for this company yet'}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeData} margin={{ top: 10, right: 15, left: 10, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis
                    dataKey="route"
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

        {/* Payment Methods Breakdown Pie Chart */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <PieIcon size={20} />
              </div>
              <CardTitle>{messages.company.reports.paymentMethodsTitle}</CardTitle>
            </div>

            <div className="mt-4 h-56 w-full flex items-center justify-center">
              {isLoading ? (
                /* Animated Geometric Circular Donut Loader */
                <div className="relative flex items-center justify-center">
                  <div className="h-36 w-36 rounded-full border-8 border-slate-100 dark:border-slate-800" />
                  <div
                    className="absolute h-36 w-36 rounded-full border-8 border-transparent border-t-bolman-purple border-r-emerald-500 animate-spin"
                    style={{ animationDuration: '2s' }}
                  />
                  <div className="absolute h-20 w-20 rounded-full bg-slate-50 dark:bg-bolman-cardDark shadow-inner animate-pulse" />
                  <div className="absolute text-[11px] font-bold text-slate-400">
                    {locale === 'ar' ? 'تحميل...' : 'Loading...'}
                  </div>
                </div>
              ) : paymentData.length === 0 || paymentData.every((p) => p.value === 0) ? (
                <div className="text-center text-slate-400 text-xs">
                  <PieIcon size={32} className="mx-auto mb-2 opacity-40" />
                  {locale === 'ar' ? 'لا توجد عمليات دفع بعد' : 'No payment data yet'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(51, 65, 85, 0.5)',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val}% (${item.payload.count} ${locale === 'ar' ? 'حجز' : 'bookings'})`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-2 space-y-2 border-t border-slate-200/80 pt-3 dark:border-slate-800 text-xs font-semibold">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 rounded bg-slate-200/60 dark:bg-slate-700/50 animate-pulse" />
                <div className="h-4 rounded bg-slate-200/60 dark:bg-slate-700/50 animate-pulse" />
              </div>
            ) : (
              paymentData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.value}% <span className="text-[10px] text-slate-400">({item.count})</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Detailed Route Breakdown Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>{messages.company.reports.routeSummaryTitle}</CardTitle>
          {!isLoading && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl">
              {routeData.length} {locale === 'ar' ? 'مسارات مسجلة' : 'routes registered'}
            </span>
          )}
        </div>

        <DataTable
          columns={messages.company.reports.table as unknown as string[]}
          loading={isLoading}
          empty={!isLoading && routeData.length === 0}
        >
          {routeData.map((row) => (
            <tr key={row.route} className="hover:bg-slate-50 dark:hover:bg-bolman-surfaceDark/50 transition-colors">
              <Td className="font-bold text-bolman-purple">{row.route}</Td>
              <Td>{row.trips}</Td>
              <Td>{row.passengers}</Td>
              <Td className="font-semibold text-emerald-600 dark:text-emerald-400">{row.occupancy}</Td>
              <Td className="font-bold">{formatMoney(row.revenue)}</Td>
              <Td className="font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(row.profit)}</Td>
            </tr>
          ))}
        </DataTable>
      </Card>

      {/* Official Printable Footer (Visible only when printing) */}
      <div className="print-only mt-12 border-t-2 border-slate-300 pt-6">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div>
            <p className="font-bold">{messages.company.reports.signature}:</p>
            <div className="mt-8 h-12 w-48 border-b border-dashed border-slate-400" />
          </div>
          <div className="text-end">
            <p>ختم واعتماد {companyName}</p>
            <div className="mt-4 grid h-16 w-16 place-items-center rounded-full border-2 border-slate-400 font-bold opacity-60">
              ختم الشركة
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

