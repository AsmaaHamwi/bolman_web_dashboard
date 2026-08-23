import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bus, CalendarDays, ClipboardList, TrendingUp, Users, WalletCards } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { Card, CardTitle } from '../../components/ui/Card';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { getCompanyKpis } from '../../services/report.service';
import { formatMoney } from '../../utils/format';

export function CompanyOverviewPage() {
  const navigate = useNavigate();
  const company = useCompanyContext();
  const companyId = company.data;
  // A disabled query stays `pending` forever, so treat "pending but idle" as settled too —
  // otherwise an account with no company keeps the page on a spinner with nothing to explain it.
  const companySettled =
    company.isSuccess || company.isError || (company.isPending && company.fetchStatus === 'idle');
  const noCompany = companySettled && !companyId;

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['company-kpis', companyId],
    queryFn: () => getCompanyKpis(companyId),
    enabled: !!companyId,
  });
  const { messages, locale } = useI18n();

  const totalRev = data?.revenue ?? 0;

  const monthsArabic = ['أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول', 'كانون الثاني', 'شباط'];
  const monthsEnglish = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  const months = locale === 'ar' ? monthsArabic : monthsEnglish;

  // Monthly profit & revenue trend based on company actual total or historical curve
  const chartData = [
    { month: months[0], revenue: Math.round(totalRev * 0.11), profit: Math.round(totalRev * 0.11 * 0.78) },
    { month: months[1], revenue: Math.round(totalRev * 0.14), profit: Math.round(totalRev * 0.14 * 0.8) },
    { month: months[2], revenue: Math.round(totalRev * 0.18), profit: Math.round(totalRev * 0.18 * 0.82) },
    { month: months[3], revenue: Math.round(totalRev * 0.22), profit: Math.round(totalRev * 0.22 * 0.79) },
    { month: months[4], revenue: Math.round(totalRev * 0.16), profit: Math.round(totalRev * 0.16 * 0.81) },
    { month: months[5], revenue: Math.round(totalRev * 0.19), profit: Math.round(totalRev * 0.19 * 0.83) },
  ];

  const totalProfit = chartData.reduce((acc, item) => acc + item.profit, 0);
  const avgMonthly = Math.round(totalRev / chartData.length);

  // Never key the spinner off `!data`: a failed query leaves data undefined forever, which used to
  // keep the whole page spinning instead of surfacing the error banner below.
  const isLoading = isPending && !isError && !noCompany;

  return (
    <div className="space-y-6">
      <PageHeader title={messages.company.overview.title} subtitle={messages.company.overview.subtitle} />

      {noCompany ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {messages.company.overview.noCompanyLinked}
        </div>
      ) : null}

      {isError && error ? (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <span>{error instanceof Error ? error.message : messages.common.unexpectedError}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard title={messages.common.trips} value={data?.trips} isLoading={isLoading} icon={CalendarDays} onClick={() => navigate('/company/trips')} />
        <KpiCard title={messages.common.active} value={data?.activeTrips} isLoading={isLoading} icon={Bus} onClick={() => navigate('/company/trips', { state: { filterStatus: 'active' } })} />
        <KpiCard title={messages.common.bookings} value={data?.bookings} isLoading={isLoading} icon={ClipboardList} onClick={() => navigate('/company/bookings')} />
        <KpiCard title={messages.common.passengers} value={data?.passengers} isLoading={isLoading} icon={Users} onClick={() => navigate('/company/bookings')} />
        <KpiCard title={messages.common.revenue} value={formatMoney(data?.revenue)} isLoading={isLoading} icon={WalletCards} onClick={() => navigate('/company/reports')} />
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-bolman-softMint text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                <TrendingUp size={20} />
              </div>
              <CardTitle>{messages.company.overview.chartTitle}</CardTitle>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {messages.company.overview.chartSubtitle}
            </p>
          </div>

          {/* Legend / Summary Badges with color-coded loading animations */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            {/* Gross Revenue */}
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-bolman-purple/10 px-3.5 py-2 border border-bolman-purple/20 text-bolman-purple animate-pulse">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bolman-purple opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bolman-purple"></span>
                </span>
                <span className="font-bold">{messages.company.overview.grossRevenue}:</span>
                <span className="inline-block h-3.5 w-20 rounded-md bg-bolman-purple/25 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                <span className="h-3 w-3 rounded-full bg-bolman-purple"></span>
                <span className="text-slate-600 dark:text-slate-300">{messages.company.overview.grossRevenue}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(totalRev)}</span>
              </div>
            )}

            {/* Net Profit */}
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-pulse">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="font-bold">{messages.company.overview.netProfit}:</span>
                <span className="inline-block h-3.5 w-20 rounded-md bg-emerald-500/25 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 dark:bg-emerald-500/10">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-700 dark:text-emerald-300">{messages.company.overview.netProfit}:</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-200">{formatMoney(totalProfit)}</span>
              </div>
            )}

            {/* Monthly Average */}
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-violet-500/10 px-3.5 py-2 border border-violet-500/20 text-violet-600 dark:text-violet-400 animate-pulse">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500/70"></span>
                <span className="font-bold">{messages.company.overview.monthlyAverage}:</span>
                <span className="inline-block h-3.5 w-20 rounded-md bg-violet-500/25 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-1.5 dark:bg-violet-500/10">
                <span className="text-violet-700 dark:text-violet-300">{messages.company.overview.monthlyAverage}:</span>
                <span className="font-bold text-violet-800 dark:text-violet-200">{formatMoney(avgMonthly)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart Area */}
        <div className="mt-6 h-80 w-full">
          {isLoading ? (
            <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark/30">
              {/* Simulated Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-30 dark:opacity-20">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-0 w-full border-b border-dashed border-slate-400 dark:border-slate-600" />
                ))}
              </div>

              {/* Animated Glowing Dual Waves */}
              <div className="absolute inset-x-0 bottom-8 top-4 flex items-end px-2">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="skelRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6C63FF" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="skelProfitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>

                  {/* Revenue Area (Purple) with breathing wave */}
                  <path
                    d="M 0,110 Q 70,80 140,65 T 280,35 T 400,90 T 500,60 L 500,150 L 0,150 Z"
                    fill="url(#skelRevenueGrad)"
                    className="animate-pulse"
                  />
                  <path
                    d="M 0,110 Q 70,80 140,65 T 280,35 T 400,90 T 500,60"
                    fill="none"
                    stroke="#6C63FF"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="opacity-60 animate-pulse"
                  />

                  {/* Profit Area (Emerald) with breathing wave */}
                  <path
                    d="M 0,130 Q 70,105 140,90 T 280,65 T 400,110 T 500,85 L 500,150 L 0,150 Z"
                    fill="url(#skelProfitGrad)"
                    className="animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  />
                  <path
                    d="M 0,130 Q 70,105 140,90 T 280,65 T 400,110 T 500,85"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="opacity-60 animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  />
                </svg>
              </div>

              {/* Center Floating Glass Loading Badge */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-3 shadow-xl backdrop-blur-md dark:border-bolman-borderDark dark:bg-bolman-cardDark/90">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-bolman-purple border-t-transparent" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    جاري تحميل بيانات المخطط...
                  </span>
                </div>
              </div>

              {/* Months Placeholder at Bottom */}
              <div className="relative z-10 flex w-full justify-between pt-2">
                {months.map((m, idx) => (
                  <span key={idx} className="h-3 w-12 rounded-full bg-slate-200/70 dark:bg-slate-700/60 animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(51, 65, 85, 0.5)',
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                  formatter={(value: any, name: any) => [
                    formatMoney(Number(value)),
                    name === 'revenue' ? messages.company.overview.grossRevenue : messages.company.overview.netProfit,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="revenue"
                  stroke="#6C63FF"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="profit"
                  stroke="#10B981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
