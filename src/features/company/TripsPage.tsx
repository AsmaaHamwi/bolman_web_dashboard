import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Loader2, Plus, Tag } from 'lucide-react';
import { AnimatedSegmentBar } from '../../components/animations/AnimatedSegmentBar';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useCities } from '../../hooks/useCities';
import { useTrips } from '../../hooks/useTrips';
import { formatDateTime, formatMoney } from '../../utils/format';
import { getDefaultTripsFilters, hasCustomTripsFilters, TripsFilterBar, type TripsListFilters } from './TripsFilterBar';

type TripSortMode = 'soonest' | 'cheapest';

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

export function TripsPage() {
  const company = useCompanyContext();
  const companyId = company.data;
  const [filters, setFilters] = useState<TripsListFilters>(() => getDefaultTripsFilters());
  const [queryFilters, setQueryFilters] = useState<TripsListFilters>(() => getDefaultTripsFilters());
  const [sortMode, setSortMode] = useState<TripSortMode>('soonest');
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

  const sortedTrips = useMemo(() => {
    const rows = [...data];
    if (sortMode === 'cheapest') {
      rows.sort((a: any, b: any) => {
        const priceA = Number(a.offer_is ? a.price_offer ?? a.price : a.price);
        const priceB = Number(b.offer_is ? b.price_offer ?? b.price : b.price);
        if (priceA !== priceB) return priceA - priceB;
        return new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime();
      });
      return rows;
    }
    rows.sort(
      (a: any, b: any) => new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime(),
    );
    return rows;
  }, [data, sortMode]);

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
        onReset={() => setFilters(getDefaultTripsFilters())}
        loading={tableLoading}
      />

      {data.length > 0 && !tableLoading ? (
        <div className="mb-4 max-w-md">
          <AnimatedSegmentBar<TripSortMode>
            value={sortMode}
            onChange={setSortMode}
            options={[
              {
                value: 'cheapest',
                label: messages.company.trips.filters.sortCheapest,
                icon: <Tag size={15} />,
              },
              {
                value: 'soonest',
                label: messages.company.trips.filters.sortSoonest,
                icon: <Clock size={15} />,
              },
            ]}
          />
        </div>
      ) : null}

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
            {hasCustomTripsFilters(queryFilters)
              ? messages.company.trips.filters.noResults
              : messages.common.noData}
          </p>
          {hasCustomTripsFilters(queryFilters) ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {messages.company.trips.filters.noResultsHint}
            </p>
          ) : null}
        </div>
      ) : (
        <div key={sortMode} className="bolman-list-switch">
        <DataTable
          columns={messages.company.trips.table as unknown as string[]}
          loading={tableLoading}
          loadingRows={8}
          empty={false}
        >
          {sortedTrips.map((trip: any) => (
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
        </div>
      )}
    </div>
  );
}
