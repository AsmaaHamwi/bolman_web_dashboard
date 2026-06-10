import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Pagination } from '../../components/ui/Pagination';
import { useI18n } from '../../hooks/useI18n';
import { useBookings } from '../../hooks/useBookings';
import { BOOKINGS_PAGE_SIZE } from '../../services/booking.service';
import { formatMoney } from '../../utils/format';

export function GlobalBookingsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isFetching } = useBookings(undefined, {
    page,
    pageSize: BOOKINGS_PAGE_SIZE,
  });
  const bookings = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const pageSize = data?.pageSize ?? BOOKINGS_PAGE_SIZE;
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
      <PageHeader title={messages.system.bookings.title} subtitle={messages.system.bookings.subtitle} />

      {total > 0 ? (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {messages.system.bookings.showingRange
            .replace('{from}', String(rangeFrom))
            .replace('{to}', String(rangeTo))
            .replace('{total}', String(total))}
        </p>
      ) : null}

      <DataTable columns={messages.system.bookings.table as unknown as string[]} loading={isPending} empty={!isPending && !bookings.length}>
        {bookings.map((booking: any) => (
          <tr key={booking.id}>
            <Td className="font-mono text-xs">{booking.id.slice(0, 8)}</Td>
            <Td>{booking.booker?.full_name || '-'}</Td>
            <Td>{booking.trip?.origin?.name} ← {booking.trip?.destination?.name}</Td>
            <Td>{booking.count_passengers}</Td>
            <Td>{formatMoney(booking.price_total)}</Td>
            <Td><StatusBadge value={booking.payment_status} /></Td>
            <Td><StatusBadge value={booking.booking_status} /></Td>
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
