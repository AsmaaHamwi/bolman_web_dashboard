import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Pagination } from '../../components/ui/Pagination';
import { StarRating } from '../../components/ui/StarRating';
import { useI18n } from '../../hooks/useI18n';
import { useBookings } from '../../hooks/useBookings';
import { BOOKINGS_PAGE_SIZE } from '../../services/booking.service';
import type { BookingsListFilters } from '../../services/booking.service';
import { formatMoney, getLocalDateInputValue } from '../../utils/format';
import { bookerDisplay } from '../../utils/bookingDisplay';

type BookingsPeriod = 'all' | 'past' | 'current' | 'future';

function periodFilters(period: BookingsPeriod): BookingsListFilters {
  const today = getLocalDateInputValue();
  const yesterday = getLocalDateInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const tomorrow = getLocalDateInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000));

  switch (period) {
    case 'past':
      return { tripDateTo: yesterday };
    case 'current':
      return { tripDateFrom: today, tripDateTo: today };
    case 'future':
      return { tripDateFrom: tomorrow };
    default:
      return { includePastTrips: true };
  }
}

function bookingRatingCell(booking: any, messages: { common: { notApplicable: string; noRating: string } }) {
  const value = booking.rating_value != null ? Number(booking.rating_value) : null;
  if (value != null) return <StarRating value={value} />;
  if (booking.booking_status === 'completed') {
    return <StarRating value={null} emptyLabel={messages.common.noRating} />;
  }
  return <StarRating value={null} emptyLabel={messages.common.notApplicable} />;
}

export function GlobalBookingsPage() {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<BookingsPeriod>('all');
  const filters = useMemo(() => periodFilters(period), [period]);
  const { data, isPending, isFetching } = useBookings(undefined, {
    page,
    pageSize: BOOKINGS_PAGE_SIZE,
    filters,
    live: true,
  });
  const bookings = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const pageSize = data?.pageSize ?? BOOKINGS_PAGE_SIZE;
  const { messages } = useI18n();
  const periodCopy = messages.system.bookings.periods;
  const periodTabs: { key: BookingsPeriod; label: string }[] = [
    { key: 'all', label: periodCopy.all },
    { key: 'past', label: periodCopy.past },
    { key: 'current', label: periodCopy.current },
    { key: 'future', label: periodCopy.future },
  ];

  useEffect(() => {
    setPage(1);
  }, [period]);

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

      <div className="mb-4 inline-flex rounded-2xl bg-slate-100/90 p-1.5 dark:bg-bolman-surfaceDark border border-slate-200/70 dark:border-bolman-borderDark">
        {periodTabs.map((tab) => {
          const isActive = period === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                isActive
                  ? 'bg-white text-bolman-purple shadow-sm dark:bg-bolman-cardDark dark:text-white ring-1 ring-slate-200/50 dark:ring-bolman-borderDark'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

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
            <Td>{bookerDisplay(booking, messages.company.bookings.officeBookingLabel)}</Td>
            <Td>{booking.trip?.origin?.name} ← {booking.trip?.destination?.name}</Td>
            <Td>{booking.count_passengers}</Td>
            <Td>{formatMoney(booking.price_total)}</Td>
            <Td><StatusBadge value={booking.payment_status} /></Td>
            <Td><StatusBadge value={booking.booking_status} /></Td>
            <Td>{bookingRatingCell(booking, messages)}</Td>
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
