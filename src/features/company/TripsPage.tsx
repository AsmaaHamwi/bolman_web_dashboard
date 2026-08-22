import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Pagination } from '../../components/ui/Pagination';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useCities } from '../../hooks/useCities';
import { useTrips } from '../../hooks/useTrips';
import { TRIPS_PAGE_SIZE, type TripsListFilters } from '../../services/trip.service';
import { formatDate, formatMoney, formatTime } from '../../utils/format';
import { EMPTY_TRIPS_FILTERS, TripsFilterBar } from './TripsFilterBar';

function filtersEqual(a: TripsListFilters, b: TripsListFilters) {
  return (
    (a.search ?? '') === (b.search ?? '')
    && (a.status ?? '') === (b.status ?? '')
    && (a.originCityId ?? '') === (b.originCityId ?? '')
    && (a.destinationCityId ?? '') === (b.destinationCityId ?? '')
    && (a.departureDateFrom ?? '') === (b.departureDateFrom ?? '')
    && (a.departureDateTo ?? '') === (b.departureDateTo ?? '')
    && (a.offerFilter ?? '') === (b.offerFilter ?? '')
  );
}

function hasActiveFilters(filters: TripsListFilters) {
  return Object.values(filters).some((value) => String(value ?? '').trim() !== '');
}

export function TripsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const company = useCompanyContext();
  const companyId = company.data;
  const [page, setPage] = useState(1);
  const initialFilters = useMemo(() => {
    if (location.state?.filterStatus) {
      return { ...EMPTY_TRIPS_FILTERS, status: location.state.filterStatus };
    }
    return EMPTY_TRIPS_FILTERS;
  }, [location.state]);
  const [filters, setFilters] = useState<TripsListFilters>(initialFilters);
  const [queryFilters, setQueryFilters] = useState<TripsListFilters>(initialFilters);
  const { data: cities = [] } = useCities();
  const { data, isPending, isFetching, isError, error, refetch } = useTrips(companyId, {
    enabled: !!companyId,
    page,
    pageSize: TRIPS_PAGE_SIZE,
    filters: queryFilters,
  });
  const trips = Array.isArray(data) ? data : (data?.rows ?? []);
  const total = Array.isArray(data) ? data.length : (data?.total ?? 0);
  const totalPages = Array.isArray(data)
    ? (total > 0 ? Math.ceil(total / TRIPS_PAGE_SIZE) : 0)
    : (data?.totalPages ?? 0);
  const pageSize = (Array.isArray(data) ? TRIPS_PAGE_SIZE : data?.pageSize) ?? TRIPS_PAGE_SIZE;

  const { messages } = useI18n();
  const loading = company.isPending || isPending;
  const filtersPending = !filtersEqual(filters, queryFilters);
  const tableLoading = loading || isFetching || filtersPending;

  useEffect(() => {
    const timer = window.setTimeout(() => setQueryFilters(filters), filters.search?.trim() ? 400 : 0);
    return () => window.clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [companyId, queryFilters]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const cityOptions = useMemo(
    () => cities.map((city) => ({ id: city.id, name: city.name })),
    [cities],
  );

  return (
    <div>
      <PageHeader
        title={messages.company.trips.title}
        subtitle={messages.company.trips.subtitle}
        actions={
          <Link to="/company/trips/create">
            <Button>
              <Plus size={18} />
              {messages.company.trips.createButton}
            </Button>
          </Link>
        }
      />

      <TripsFilterBar
        filters={filters}
        cities={cityOptions}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_TRIPS_FILTERS)}
        loading={tableLoading}
      />

      {tableLoading ? (
        <div
          className="mb-4 flex items-center gap-2 rounded-2xl border border-bolman-purple/20 bg-bolman-purple/5 px-4 py-3 text-sm font-medium text-bolman-purple dark:border-bolman-purple/30 dark:bg-bolman-purple/10 dark:text-violet-200"
          role="status"
          aria-live="polite"
        >
          <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
          {messages.common.loadingResults}
        </div>
      ) : null}

      {isError && error ? (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
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


      {total > 0 ? (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {messages.company.trips.showingRange
            .replace('{from}', String(rangeFrom))
            .replace('{to}', String(rangeTo))
            .replace('{total}', String(total))}
        </p>
      ) : null}

      {!tableLoading && !trips.length && !isError ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-slate-300">
          <p className="text-base font-medium text-slate-800 dark:text-white">
            {hasActiveFilters(queryFilters)
              ? messages.company.trips.filters.noResults
              : messages.common.noData}
          </p>
          {hasActiveFilters(queryFilters) ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {messages.company.trips.filters.noResultsHint}
            </p>
          ) : null}
        </div>
      ) : (
        <DataTable
          columns={messages.company.trips.table as unknown as string[]}
          loading={tableLoading}
          loadingRows={8}
          empty={false}
        >
          {trips.map((trip: any) => (
            <tr
              key={trip.id}
              onClick={() => navigate(`/company/trips/${trip.id}`)}
              className="group cursor-pointer transition-colors hover:bg-slate-100/80 dark:hover:bg-bolman-surfaceDark/80"
            >
              <Td className="font-bold text-bolman-purple group-hover:underline">
                {trip.origin?.name} - {trip.destination?.name}
              </Td>
              <Td>{trip.bus?.number_bus}</Td>
              <Td>{trip.driver?.user?.full_name}</Td>
              <Td>{formatDate(trip.departure_datetime)}</Td>
              <Td>{formatTime(trip.departure_datetime)}</Td>
              <Td>{formatMoney(trip.price)}</Td>
              <Td>{trip.offer_is ? formatMoney(trip.price_offer) : '-'}</Td>
              <Td><StatusBadge value={trip.status} /></Td>
            </tr>
          ))}
        </DataTable>
      )}

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          disabled={tableLoading}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
