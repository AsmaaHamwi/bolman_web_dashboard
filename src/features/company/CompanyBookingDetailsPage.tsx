import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Status';
import { DataTable, Td } from '../../components/ui/Table';
import { SeatMap } from '../../components/booking/SeatMap';
import { useI18n } from '../../hooks/useI18n';
import { useSeatStatus } from '../../hooks/useSeats';
import { cancelBookingWithRefund, getBookingDetails, modifyBookingBeforeCutoff } from '../../services/booking.service';
import { getTripStops } from '../../services/trip.service';
import { formatDateTime, formatMoney } from '../../utils/format';
import { getBoardingStops, getDropoffStops, getTripStopLabel } from '../../utils/tripStops';
import { mapKnownBookingRpcError } from '../../utils/bookingErrors';

export function CompanyBookingDetailsPage() {
  const { bookingId = '' } = useParams();
  const queryClient = useQueryClient();
  const { messages } = useI18n();
  const bd = messages.company.bookingDetails;
  const bookingQuery = useQuery({ queryKey: ['booking', bookingId], queryFn: () => getBookingDetails(bookingId), enabled: !!bookingId });
  const tripId = (bookingQuery.data?.trip_id as string | undefined) ?? bookingQuery.data?.trip?.id;
  const stopsQuery = useQuery({ queryKey: ['booking-trip-stops', tripId], queryFn: () => getTripStops(tripId!), enabled: !!tripId });
  const [openCancel, setOpenCancel] = useState(false);
  const [openModify, setOpenModify] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [ticketMode, setTicketMode] = useState<'group' | 'individual'>('group');
  const [passengers, setPassengers] = useState<Array<{ full_name: string; phone: string; national_id: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: seats = [] } = useSeatStatus(openModify && tripId && from && to ? { tripId, fromTripStopId: from, toTripStopId: to } : undefined);
  const boardingStops = getBoardingStops((stopsQuery.data ?? []) as any);
  const dropoffStops = getDropoffStops((stopsQuery.data ?? []) as any, from);

  useEffect(() => {
    if (!openModify) return;
    const n = selected.length;
    if (n <= 0) {
      setPassengers([]);
      return;
    }
    setPassengers((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ full_name: '', phone: '', national_id: '' });
      while (next.length > n) next.pop();
      return next;
    });
  }, [selected.length, openModify]);

  const canSubmitModify =
    from &&
    to &&
    selected.length > 0 &&
    passengers.length === selected.length &&
    passengers.every((p) => p.full_name.trim() && p.national_id.trim());

  const rpcMessages = {
    rpcCancelBookingMissing: messages.common.rpcCancelBookingMissing,
    rpcModifyBookingMissing: messages.common.rpcModifyBookingMissing,
  };

  const cancelMutation = useMutation({
    mutationFn: () => cancelBookingWithRefund(bookingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking', bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      ]);
      setOpenCancel(false);
    },
    onError: (mutationError) => {
      const mapped = mapKnownBookingRpcError(mutationError, rpcMessages);
      setError(mapped || (mutationError instanceof Error ? mutationError.message : messages.common.unexpectedError));
    },
  });

  const modifyMutation = useMutation({
    mutationFn: () =>
      modifyBookingBeforeCutoff({
        booking_id: bookingId,
        from_trip_stop_id: from,
        to_trip_stop_id: to,
        bus_seat_ids: selected,
        passengers: passengers.map((p) => ({
          full_name: p.full_name.trim(),
          phone: p.phone?.trim() || undefined,
          national_id: p.national_id.trim(),
        })),
        ticket_mode: ticketMode,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking', bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
      setOpenModify(false);
      setError(null);
    },
    onError: (mutationError) => {
      const mapped = mapKnownBookingRpcError(mutationError, rpcMessages);
      setError(mapped || (mutationError instanceof Error ? mutationError.message : messages.common.unexpectedError));
    },
  });

  const booking = bookingQuery.data;
  const currentSeats = booking?.booking_seats?.map((seat: any) => seat.seat?.seat_number).filter(Boolean).join(', ') || '-';

  function openModifyModal() {
    if (!booking) return;
    setFrom(booking.from_trip_stop_id || '');
    setTo(booking.to_trip_stop_id || '');
    const seatIds = (booking.booking_seats ?? [])
      .map((s: any) => (s.bus_seat_id ?? s.seat?.id) as string | undefined)
      .filter(Boolean) as string[];
    setSelected(seatIds);
    setTicketMode((booking.ticket_mode as 'group' | 'individual') || 'group');
    setPassengers(
      (booking.booking_passengers ?? []).map((passenger: any) => ({
        full_name: passenger.full_name || '',
        phone: passenger.phone || '',
        national_id: passenger.national_id || '',
      })),
    );
    setError(null);
    setOpenModify(true);
  }

  if (bookingQuery.isPending) {
    return <div className="grid min-h-[40vh] place-items-center text-bolman-purple">{messages.common.loading}</div>;
  }

  if (!booking) {
    return (
      <Card>
        <CardTitle>{bd.notFoundTitle}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{bd.notFoundBody}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${bd.pageTitle} ${booking.id.slice(0, 8)}`}
        subtitle={`${booking.trip?.origin?.name || '-'} - ${booking.trip?.destination?.name || '-'}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={openModifyModal}>{bd.modifyBooking}</Button>
            <Button variant="danger" onClick={() => { setError(null); setOpenCancel(true); }}>{bd.cancelBooking}</Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>{bd.statusCard}</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{bd.bookingStatusLabel}</span>
              <StatusBadge value={booking.booking_status} />
            </div>
            <div className="flex items-center justify-between">
              <span>{bd.paymentStatusLabel}</span>
              <StatusBadge value={booking.payment_status} />
            </div>
            <div className="flex items-center justify-between">
              <span>{bd.modeLabel}</span>
              <span>{booking.ticket_mode === 'group' ? messages.ticketMode.qrGroup : messages.ticketMode.qrIndividual}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>{bd.commercialCard}</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{bd.totalLabel}</span>
              <span>{formatMoney(booking.price_total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{bd.passengersLabel}</span>
              <span>{booking.count_passengers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{bd.createdAtLabel}</span>
              <span>{formatDateTime(booking.created_at)}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>{bd.journeyCard}</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{bd.routeLabel}</span>
              <span>{booking.trip?.origin?.name || '-'} - {booking.trip?.destination?.name || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{bd.departureLabel}</span>
              <span>{booking.trip?.departure_datetime ? formatDateTime(booking.trip.departure_datetime) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{bd.currentSeatsLabel}</span>
              <span>{currentSeats}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{bd.passengersSection}</CardTitle>
        <div className="mt-4">
          <DataTable
            columns={[bd.tablePassenger, bd.tablePhone, bd.tableNationalId]}
            loading={false}
            empty={!booking.booking_passengers?.length}
          >
            {(booking.booking_passengers ?? []).map((passenger: any) => (
              <tr key={passenger.id}>
                <Td className="font-semibold">{passenger.full_name}</Td>
                <Td>{passenger.phone || '-'}</Td>
                <Td>{passenger.national_id || '-'}</Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Card>

      <Card>
        <CardTitle>{bd.ticketsSection}</CardTitle>
        <div className="mt-4">
          <DataTable
            columns={[bd.tableCode, bd.tableType, bd.tableTicketStatus]}
            loading={false}
            empty={!booking.tickets?.length}
          >
            {(booking.tickets ?? []).map((ticket: any) => (
              <tr key={ticket.id}>
                <Td className="font-mono text-xs">{ticket.ticket_code}</Td>
                <Td>{ticket.ticket_type === 'group' ? messages.ticketMode.qrGroup : messages.ticketMode.qrIndividual}</Td>
                <Td><StatusBadge value={ticket.status} /></Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Card>

      <Modal open={openCancel} onClose={() => !cancelMutation.isPending && setOpenCancel(false)} title={bd.cancelModalTitle}>
        <div className="grid gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {bd.cancelModalBody}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenCancel(false)} disabled={cancelMutation.isPending}>
              {messages.common.close}
            </Button>
            <Button variant="danger" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? messages.common.loading : bd.confirmCancel}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={openModify} onClose={() => !modifyMutation.isPending && setOpenModify(false)} title={bd.modifyModalTitle}>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {bd.modifyModalHint}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={messages.company.manualBooking.from}>
              <Select value={from} onChange={(e) => { setFrom(e.target.value); setTo(''); }}>
                <option value="">{messages.common.choose}</option>
                {boardingStops.map((stop: any) => <option key={stop.id} value={stop.id}>{getTripStopLabel(stop)}</option>)}
              </Select>
            </Field>
            <Field label={messages.company.manualBooking.to}>
              <Select value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">{messages.common.choose}</option>
                {dropoffStops.map((stop: any) => <option key={stop.id} value={stop.id}>{getTripStopLabel(stop)}</option>)}
              </Select>
            </Field>
            <Field label={messages.ticketMode.label}>
              <Select value={ticketMode} onChange={(e) => setTicketMode(e.target.value as 'group' | 'individual')}>
                <option value="group">{messages.ticketMode.qrGroup}</option>
                <option value="individual">{messages.ticketMode.qrIndividual}</option>
              </Select>
            </Field>
          </div>

          <div>
            <div className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{bd.selectSeatsTitle}</div>
            <SeatMap seats={seats} selected={selected} onToggle={(id) => setSelected((state) => state.includes(id) ? state.filter((item) => item !== id) : [...state, id])} />
          </div>

          {!canSubmitModify && from && to ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{messages.company.manualBooking.submitHint}</p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {passengers.map((passenger, index) => (
              <div key={`modify-passenger-${index}`} className="space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-bolman-surfaceDark">
                <Field label={`${bd.passengerNumber} ${index + 1}`}>
                  <Input value={passenger.full_name} onChange={(e) => setPassengers(passengers.map((item, itemIndex) => itemIndex === index ? { ...item, full_name: e.target.value } : item))} />
                </Field>
                <Field label={messages.common.phone}>
                  <Input value={passenger.phone} onChange={(e) => setPassengers(passengers.map((item, itemIndex) => itemIndex === index ? { ...item, phone: e.target.value } : item))} />
                </Field>
                <Field label={messages.company.manualBooking.nationalId}>
                  <Input value={passenger.national_id} onChange={(e) => setPassengers(passengers.map((item, itemIndex) => itemIndex === index ? { ...item, national_id: e.target.value } : item))} />
                </Field>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenModify(false)} disabled={modifyMutation.isPending}>
              {messages.common.close}
            </Button>
            <Button onClick={() => modifyMutation.mutate()} disabled={!canSubmitModify || modifyMutation.isPending}>
              {modifyMutation.isPending ? messages.common.loading : bd.confirmModify}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
