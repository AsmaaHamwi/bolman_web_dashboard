import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useUpdateTrip, useTrips } from '../../hooks/useTrips';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DateInput } from '../../components/ui/DateInput';
import { FilterPanel, CompactFilterControl, compactFilterInputClass } from '../../components/ui/FilterPanel';
import { Pagination } from '../../components/ui/Pagination';
import { useI18n } from '../../hooks/useI18n';
import { TRIPS_PAGE_SIZE, type TripsListFilters } from '../../services/trip.service';
import { formatDate, formatMoney, getLocalDateInputValue } from '../../utils/format';

const EMPTY_OFFERS_FILTERS: TripsListFilters = {
  search: '',
  departureDateFrom: '',
  departureDateTo: '',
};

function offersFiltersEqual(a: TripsListFilters, b: TripsListFilters) {
  return (
    (a.search ?? '') === (b.search ?? '')
    && (a.departureDateFrom ?? '') === (b.departureDateFrom ?? '')
    && (a.departureDateTo ?? '') === (b.departureDateTo ?? '')
  );
}

function hasActiveOffersFilters(filters: TripsListFilters) {
  return Object.values(filters).some((value) => String(value ?? '').trim() !== '');
}

// Offers are only actionable for trips that have not departed yet, so today is a hard floor.
function latestDate(...dates: Array<string | undefined>) {
  return dates.map((date) => (date ?? '').trim()).filter(Boolean).sort().pop() ?? '';
}

export function OffersPage() {
  const company = useCompanyContext();
  const companyId = company.data;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TripsListFilters>(EMPTY_OFFERS_FILTERS);
  const [queryFilters, setQueryFilters] = useState<TripsListFilters>(EMPTY_OFFERS_FILTERS);
  const today = getLocalDateInputValue();
  const effectiveFilters: TripsListFilters = {
    ...queryFilters,
    departureDateFrom: latestDate(queryFilters.departureDateFrom, today),
  };
  const { data, isPending } = useTrips(companyId, {
    enabled: !!companyId,
    page,
    pageSize: TRIPS_PAGE_SIZE,
    filters: effectiveFilters,
    sort: 'departure_asc',
  });

  const trips = Array.isArray(data) ? data : (data?.rows ?? []);
  const total = Array.isArray(data) ? data.length : (data?.total ?? 0);
  const totalPages = Array.isArray(data)
    ? (total > 0 ? Math.ceil(total / TRIPS_PAGE_SIZE) : 0)
    : (data?.totalPages ?? 0);
  const pageSize = (Array.isArray(data) ? TRIPS_PAGE_SIZE : data?.pageSize) ?? TRIPS_PAGE_SIZE;

  const update = useUpdateTrip();
  const { messages } = useI18n();
  const copy = messages.company.offers.filters;
  const loading = company.isPending || isPending;
  const filtersPending = !offersFiltersEqual(filters, queryFilters);
  // Row updates (activate/remove offer) refetch in the background via placeholderData,
  // so they should not blank the table into the loading skeleton — only the initial
  // load and an explicit filter change should.
  const tableLoading = loading || filtersPending;

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

  function updateFilter<K extends keyof TripsListFilters>(key: K, value: TripsListFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const activeFilterCount = [filters.departureDateFrom, filters.departureDateTo].filter((value) => String(value ?? '').trim()).length;

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div>
      <PageHeader title={messages.company.offers.title} subtitle={messages.company.offers.subtitle} />

      <FilterPanel
        title={copy.title}
        clearLabel={copy.clear}
        showFiltersLabel={messages.common.showFilters}
        hideFiltersLabel={messages.common.hideFilters}
        loading={tableLoading}
        showReset={hasActiveOffersFilters(filters)}
        onReset={() => setFilters(EMPTY_OFFERS_FILTERS)}
        activeCount={activeFilterCount}
        search={
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              className={`${compactFilterInputClass} ps-9`}
              value={filters.search ?? ''}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.search}
            />
          </div>
        }
      >
        <CompactFilterControl label={copy.departureDateFrom} className="min-w-[13rem] max-w-[15rem]">
          <DateInput
            className={compactFilterInputClass}
            value={filters.departureDateFrom ?? ''}
            min={today}
            onChange={(val) => updateFilter('departureDateFrom', val)}
          />
        </CompactFilterControl>

        <CompactFilterControl label={copy.departureDateTo} className="min-w-[13rem] max-w-[15rem]">
          <DateInput
            className={compactFilterInputClass}
            value={filters.departureDateTo ?? ''}
            min={latestDate(filters.departureDateFrom, today)}
            onChange={(val) => updateFilter('departureDateTo', val)}
          />
        </CompactFilterControl>
      </FilterPanel>

      {total > 0 ? (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {messages.company.offers.showingRange
            .replace('{from}', String(rangeFrom))
            .replace('{to}', String(rangeTo))
            .replace('{total}', String(total))}
        </p>
      ) : null}

      {!tableLoading && !trips.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-slate-300">
          <p className="text-base font-medium text-slate-800 dark:text-white">
            {hasActiveOffersFilters(queryFilters) ? copy.noResults : messages.common.noData}
          </p>
          {hasActiveOffersFilters(queryFilters) ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.noResultsHint}</p>
          ) : null}
        </div>
      ) : (
        <DataTable columns={messages.company.offers.table as unknown as string[]} loading={tableLoading} empty={false}>
          {trips.map((trip: any) => (
            <tr key={trip.id}>
              <Td>{trip.origin?.name} ← {trip.destination?.name}</Td>
              <Td>{formatDate(trip.departure_datetime)}</Td>
              <Td>{formatMoney(trip.price)}</Td>
              <Td>{trip.price_offer ? formatMoney(trip.price_offer) : '-'}</Td>
              <Td>{trip.title_offer || '-'}</Td>
              <Td>
                <Button
                  variant="secondary"
                  loading={update.isPending && update.variables?.id === trip.id}
                  onClick={() =>
                    update.mutate({
                      id: trip.id,
                      patch: {
                        offer_is: !trip.offer_is,
                        price_offer: trip.offer_is ? null : trip.price * 0.85,
                        title_offer: trip.offer_is ? null : messages.company.offers.specialOffer,
                      },
                    })
                  }
                >
                  {trip.offer_is ? messages.common.remove : messages.company.offers.activateOffer}
                </Button>
              </Td>
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
