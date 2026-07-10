import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Button } from '../../components/ui/Button';
import { TicketQrModal } from '../../components/booking/TicketQrModal';
import { Pagination } from '../../components/ui/Pagination';
import { StarRating } from '../../components/ui/StarRating';
import { BOOKINGS_PAGE_SIZE } from '../../services/booking.service';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useBookings } from '../../hooks/useBookings';
import { getBookingDetails } from '../../services/booking.service';
import { BookingsFilterBar, getDefaultBookingsFilters, hasCustomBookingsFilters } from './BookingsFilterBar';
import type { BookingsListFilters } from '../../services/booking.service';
import { formatDateTime, formatMoney } from '../../utils/format';
import { bookerDisplay } from '../../utils/bookingDisplay';

function seatNumbersFromBooking(row: any): string {
  const seats = row.booking_seats ?? [];
  return seats
    .map((bs: any) => bs.seat?.seat_number ?? bs.bus_seats?.seat_number)
    .filter((n: any) => n != null && n !== '')
    .join(', ');
}

function paymentMethodFirst(row: any): string {
  const p = row.payments;
  if (Array.isArray(p) && p[0]?.payment_method) return String(p[0].payment_method);
  return '-';
}

function hasActiveFilters(filters: BookingsListFilters) {
  return hasCustomBookingsFilters(filters);
}

function filtersEqual(a: BookingsListFilters, b: BookingsListFilters) {
  return (
    (a.search ?? '') === (b.search ?? '')
    && (a.bookingStatus ?? '') === (b.bookingStatus ?? '')
    && (a.paymentStatus ?? '') === (b.paymentStatus ?? '')
    && (a.paymentMethod ?? '') === (b.paymentMethod ?? '')
    && (a.ticketMode ?? '') === (b.ticketMode ?? '')
    && (a.tripDateFrom ?? '') === (b.tripDateFrom ?? '')
    && (a.tripDateTo ?? '') === (b.tripDateTo ?? '')
  );
}

function bookingRatingCell(booking: any, messages: { common: { notApplicable: string }; company: { bookings: { ratingPending: string } } }) {
  const value = booking.rating_value != null ? Number(booking.rating_value) : null;
  if (value != null) return <StarRating value={value} />;
  if (booking.booking_status === 'completed') {
    return <StarRating value={null} emptyLabel={messages.company.bookings.ratingPending} />;
  }
  return <StarRating value={null} emptyLabel={messages.common.notApplicable} />;
}

export function CompanyBookingsPage() {
  const company = useCompanyContext();
  const companyId = company.data;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<BookingsListFilters>(() => getDefaultBookingsFilters());
  const [queryFilters, setQueryFilters] = useState<BookingsListFilters>(() => getDefaultBookingsFilters());
  const { data, isPending, error, isError, isFetching } = useBookings(companyId, {
    enabled: !!companyId,
    page,
    pageSize: BOOKINGS_PAGE_SIZE,
    filters: queryFilters,
    live: true,
  });
  const bookings = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const pageSize = data?.pageSize ?? BOOKINGS_PAGE_SIZE;
  const { messages } = useI18n();
  const loading = company.isPending || isPending;
  const filtersPending = !filtersEqual(filters, queryFilters);
  const tableLoading = (loading || filtersPending) && !bookings.length;
  const refreshing = isFetching && !!bookings.length;
  const [qrBooking, setQrBooking] = useState<any | null>(null);
  const [qrLoadingId, setQrLoadingId] = useState<string | null>(null);

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

  const columns = useMemo(
    () => messages.company.bookings.table as unknown as string[],
    [messages.company.bookings.table],
  );

  const officeLabel = messages.company.bookings.officeBookingLabel;
  const shareCopy = {
    heading: messages.company.bookings.shareHeading,
    route: messages.company.bookings.shareRoute,
    departure: messages.company.bookings.shareDeparture,
    bus: messages.company.bookings.shareBus,
    seats: messages.company.bookings.shareSeats,
    passenger: messages.company.bookings.sharePassenger,
    ticketCode: messages.company.bookings.shareTicketCode,
    scanHint: messages.company.bookings.shareScanHint,
    routeArrow: '→',
  };

  return (
    <div>
      <PageHeader title={messages.company.bookings.title} subtitle={messages.company.bookings.subtitle} />

      <BookingsFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(getDefaultBookingsFilters())}
        loading={tableLoading}
      />

      {tableLoading || refreshing ? (
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
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error instanceof Error ? error.message : messages.common.unexpectedError}
        </div>
      ) : null}

      {total > 0 ? (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {messages.company.bookings.showingRange
            .replace('{from}', String(rangeFrom))
            .replace('{to}', String(rangeTo))
            .replace('{total}', String(total))}
        </p>
      ) : null}

      {!tableLoading && !bookings.length && !isError ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-slate-300">
          <p className="text-base font-medium text-slate-800 dark:text-white">
            {hasActiveFilters(queryFilters)
              ? messages.company.bookings.filters.noResults
              : messages.company.bookings.noCompanyBookings}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {hasActiveFilters(queryFilters)
              ? messages.company.bookings.filters.noResultsHint
              : messages.company.bookings.noCompanyBookingsHint}
          </p>
        </div>
      ) : (
        <DataTable columns={columns} loading={tableLoading} loadingRows={8} empty={false}>
          {bookings.map((booking: any) => (
            <tr key={booking.id}>
              <Td className="font-mono text-xs">
                <Link to={`/company/bookings/${booking.id}`} className="text-bolman-purple hover:underline">
                  {booking.id.slice(0, 8)}
                </Link>
              </Td>
              <Td>{bookerDisplay(booking, officeLabel)}</Td>
              <Td>
                {booking.trip?.origin?.name ?? '-'} — {booking.trip?.destination?.name ?? '-'}
              </Td>
              <Td>{booking.trip?.departure_datetime ? formatDateTime(booking.trip.departure_datetime) : '-'}</Td>
              <Td>{booking.count_passengers}</Td>
              <Td className="max-w-[140px] truncate">
                <span title={seatNumbersFromBooking(booking)}>{seatNumbersFromBooking(booking) || '-'}</span>
              </Td>
              <Td>{formatMoney(booking.price_total)}</Td>
              <Td><StatusBadge value={booking.payment_status} /></Td>
              <Td>{paymentMethodFirst(booking)}</Td>
              <Td>{booking.ticket_mode === 'group' ? messages.ticketMode.qrGroup : messages.ticketMode.qrIndividual}</Td>
              <Td><StatusBadge value={booking.booking_status} /></Td>
              <Td>{bookingRatingCell(booking, messages)}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/company/bookings/${booking.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-white dark:hover:bg-bolman-surfaceDark"
                  >
                    {messages.company.bookings.actionDetails}
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={qrLoadingId === booking.id}
                    onClick={async () => {
                      setQrLoadingId(booking.id);
                      try {
                        const details = await getBookingDetails(booking.id);
                        setQrBooking(details);
                      } finally {
                        setQrLoadingId(null);
                      }
                    }}
                  >
                    {messages.company.bookings.actionQr}
                  </Button>
                  <Link
                    to={`/company/bookings/${booking.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-white dark:hover:bg-bolman-surfaceDark"
                  >
                    {messages.company.bookings.actionModifyCancel}
                  </Link>
                </div>
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

      <TicketQrModal
        open={!!qrBooking}
        onClose={() => setQrBooking(null)}
        booking={qrBooking}
        title={messages.company.bookings.qrModalTitle}
        emptyLabel={messages.company.bookings.noQrTokens}
        shareLabel={messages.company.bookings.shareTicket}
        shareFailedLabel={messages.company.bookings.shareFailed}
        shareDownloadedLabel={messages.company.bookings.shareDownloaded}
        groupTicketLabel={messages.ticketMode.qrGroup}
        individualTicketLabel={messages.ticketMode.qrIndividual}
        closeLabel={messages.common.close}
        shareCopy={shareCopy}
      />
    </div>
  );
}
