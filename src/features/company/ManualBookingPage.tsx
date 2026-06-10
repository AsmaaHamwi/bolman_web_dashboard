import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SeatMap } from '../../components/booking/SeatMap';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useTrips, useTripStops } from '../../hooks/useTrips';
import { useSeatStatus } from '../../hooks/useSeats';
import { getBoardingStops, getDropoffStops, getTripStopLabel } from '../../utils/tripStops';
import { confirmOfficeCashBooking } from '../../services/booking.service';

export function ManualBookingPage() {
  const { data: companyId } = useCompanyContext();
  const { messages } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: trips = [] } = useTrips(companyId, { enabled: !!companyId });
  const [tripId, setTripId] = useState('');
  const { data: stops = [] } = useTripStops(tripId);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ticketMode, setTicketMode] = useState<'group' | 'individual'>('group');
  const [selected, setSelected] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Array<{ full_name: string; phone: string; national_id: string }>>([]);
  const { data: seats = [] } = useSeatStatus(tripId && from && to ? { tripId, fromTripStopId: from, toTripStopId: to } : undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [selected.length]);

  const confirm = useMutation({
    mutationFn: confirmOfficeCashBooking,
    onSuccess: async (bookingId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['seat-status'] }),
        queryClient.invalidateQueries({ queryKey: ['trip-booking-count', tripId] }),
      ]);
      setError(null);
      navigate(`/company/bookings/${bookingId}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : messages.common.unexpectedError);
    },
  });

  const canSubmit =
    tripId &&
    from &&
    to &&
    selected.length > 0 &&
    passengers.length === selected.length &&
    passengers.every((p) => p.full_name.trim() && p.national_id.trim());

  const boardingStops = getBoardingStops(stops as any);
  const dropoffStops = getDropoffStops(stops as any, from);

  return (
    <div>
      <PageHeader title={messages.company.manualBooking.title} subtitle={messages.company.manualBooking.subtitle} />
      <div className="grid gap-5 xl:grid-cols-3">
        {error ? (
          <div className="xl:col-span-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <Card>
          <CardTitle>{messages.company.manualBooking.tripSection}</CardTitle>
          <div className="mt-4 space-y-3">
            <Field label={messages.company.manualBooking.trip}>
              <Select
                value={tripId}
                onChange={(e) => {
                  setTripId(e.target.value);
                  setFrom('');
                  setTo('');
                  setSelected([]);
                }}
              >
                <option value="">{messages.common.choose}</option>
                {trips.map((trip: any) => <option key={trip.id} value={trip.id}>{trip.origin?.name} - {trip.destination?.name}</option>)}
              </Select>
            </Field>
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
            <Field label={messages.company.manualBooking.passengerCount}>
              <Input type="number" readOnly value={selected.length || 0} className="bg-slate-50 dark:bg-bolman-surfaceDark" />
            </Field>
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle>{messages.company.manualBooking.seatSection}</CardTitle>
          <div className="mt-4">
            <SeatMap seats={seats} selected={selected} onToggle={(id) => setSelected((state) => state.includes(id) ? state.filter((item) => item !== id) : [...state, id])} />
          </div>
        </Card>
        <Card className="xl:col-span-3">
          <CardTitle>{messages.company.manualBooking.passengerSection}</CardTitle>
          {!canSubmit && (tripId && from && to) ? (
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{messages.company.manualBooking.submitHint}</p>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {passengers.map((passenger, index) => (
              <div className="space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-bolman-surfaceDark" key={index}>
                <Field label={`${messages.company.manualBooking.passengerName} ${index + 1}`}>
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
          <Button
            className="mt-5"
            disabled={!canSubmit || confirm.isPending}
            onClick={() => {
              setError(null);
              confirm.mutate({
                booker_user_id: null,
                trip_id: tripId,
                from_trip_stop_id: from,
                to_trip_stop_id: to,
                bus_seat_ids: selected,
                passengers: passengers.map((p) => ({
                  full_name: p.full_name.trim(),
                  phone: p.phone?.trim() || undefined,
                  national_id: p.national_id.trim(),
                })),
                ticket_mode: ticketMode,
              });
            }}
          >
            {confirm.isPending ? messages.common.loading : messages.company.manualBooking.confirm}
          </Button>
        </Card>
      </div>
    </div>
  );
}
