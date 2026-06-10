import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useCities } from '../../hooks/useCities';
import { useTrips } from '../../hooks/useTrips';
import type { TripsListFilters } from '../../services/trip.service';
import { formatDateTime, formatMoney } from '../../utils/format';
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
  const company = useCompanyContext();
  const companyId = company.data;
  const [filters, setFilters] = useState<TripsListFilters>(EMPTY_TRIPS_FILTERS);
  const [queryFilters, setQueryFilters] = useState<TripsListFilters>(EMPTY_TRIPS_FILTERS);
  const { data: cities = [] } = useCities();
  const { data = [], isPending, isFetching } = useTrips(companyId, {
    enabled: !!companyId,
    filters: queryFilters,
  });
  const { messages } = useI18n();
  const loading = company.isPending || isPending;
  const filtersPending = !filtersEqual(filters, queryFilters);
  const tableLoading = loading || isFetching || filtersPending;

  useEffect(() => {
    const timer = window.setTimeout(() => setQueryFilters(filters), filters.search?.trim() ? 400 : 0);
    return () => window.clearTimeout(timer);
  }, [filters]);

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

      {!tableLoading && !data.length ? (
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
          {data.map((trip: any) => (
            <tr key={trip.id}>
              <Td className="font-bold">
                <Link to={`/company/trips/${trip.id}`} className="text-bolman-purple hover:underline">
                  {trip.origin?.name} - {trip.destination?.name}
                </Link>
              </Td>
              <Td>{trip.bus?.number_bus}</Td>
              <Td>{trip.driver?.user?.full_name}</Td>
              <Td>{formatDateTime(trip.departure_datetime)}</Td>
              <Td>{formatMoney(trip.price)}</Td>
              <Td>{trip.offer_is ? formatMoney(trip.price_offer) : '-'}</Td>
              <Td><StatusBadge value={trip.status} /></Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
