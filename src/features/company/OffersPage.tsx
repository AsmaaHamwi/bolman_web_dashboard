import { useEffect, useState } from 'react';
import { useUpdateTrip, useTrips } from '../../hooks/useTrips';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { useI18n } from '../../hooks/useI18n';
import { TRIPS_PAGE_SIZE } from '../../services/trip.service';
import { formatDate, formatMoney } from '../../utils/format';

export function OffersPage() {
  const company = useCompanyContext();
  const companyId = company.data;
  const [page, setPage] = useState(1);
  const { data, isPending, isFetching } = useTrips(companyId, {
    enabled: !!companyId,
    page,
    pageSize: TRIPS_PAGE_SIZE,
  });
  
  const trips = Array.isArray(data) ? data : (data?.rows ?? []);
  const total = Array.isArray(data) ? data.length : (data?.total ?? 0);
  const totalPages = Array.isArray(data)
    ? (total > 0 ? Math.ceil(total / TRIPS_PAGE_SIZE) : 0)
    : (data?.totalPages ?? 0);
  const pageSize = (Array.isArray(data) ? TRIPS_PAGE_SIZE : data?.pageSize) ?? TRIPS_PAGE_SIZE;

  const update = useUpdateTrip();
  const { messages } = useI18n();
  const loading = company.isPending || isPending;
  const tableLoading = loading || isFetching;

  useEffect(() => {
    setPage(1);
  }, [companyId]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div>
      <PageHeader title={messages.company.offers.title} subtitle={messages.company.offers.subtitle} />

      {total > 0 ? (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {messages.company.offers.showingRange
            .replace('{from}', String(rangeFrom))
            .replace('{to}', String(rangeTo))
            .replace('{total}', String(total))}
        </p>
      ) : null}

      <DataTable columns={messages.company.offers.table as unknown as string[]} loading={tableLoading} empty={!tableLoading && !trips.length}>
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
