import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Pagination } from '../../components/ui/Pagination';
import { useI18n } from '../../hooks/useI18n';
import { useTrips } from '../../hooks/useTrips';
import { TRIPS_PAGE_SIZE } from '../../services/trip.service';
import { formatDate, formatMoney, formatTime } from '../../utils/format';

export function GlobalTripsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isFetching } = useTrips(undefined, {
    page,
    pageSize: TRIPS_PAGE_SIZE,
    live: true,
  });
  const trips = Array.isArray(data) ? data : (data?.rows ?? []);
  const total = Array.isArray(data) ? data.length : (data?.total ?? 0);
  const totalPages = Array.isArray(data)
    ? (total > 0 ? Math.ceil(total / TRIPS_PAGE_SIZE) : 0)
    : (data?.totalPages ?? 0);
  const pageSize = (Array.isArray(data) ? TRIPS_PAGE_SIZE : data?.pageSize) ?? TRIPS_PAGE_SIZE;

  const { messages } = useI18n();

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div>
      <PageHeader title={messages.system.trips.title} subtitle={messages.system.trips.subtitle} />

      {total > 0 ? (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {messages.system.trips.showingRange
            .replace('{from}', String(rangeFrom))
            .replace('{to}', String(rangeTo))
            .replace('{total}', String(total))}
        </p>
      ) : null}

      <DataTable columns={messages.system.trips.table as unknown as string[]} loading={isPending} empty={!isPending && !trips.length}>
        {trips.map((trip: any) => (
          <tr key={trip.id}>
            <Td>{trip.company?.name}</Td>
            <Td className="font-bold">{trip.origin?.name} ← {trip.destination?.name}</Td>
            <Td>{trip.bus?.number_bus}</Td>
            <Td>{trip.driver?.user?.full_name}</Td>
            <Td>{formatDate(trip.departure_datetime)}</Td>
            <Td>{formatTime(trip.departure_datetime)}</Td>
            <Td>{formatMoney(trip.price_offer ?? trip.price)}</Td>
            <Td><StatusBadge value={trip.status} /></Td>
          </tr>
        ))}
      </DataTable>

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          disabled={isPending || isFetching}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
