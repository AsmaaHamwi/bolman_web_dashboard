import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Status';
import { DataTable, Td } from '../../components/ui/Table';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useCities } from '../../hooks/useCities';
import { useBuses, useDrivers, useRestStops } from '../../hooks/useFleet';
import {
  completeTrip,
  getTripBookingCount,
  getTripDetails,
  getTripManifest,
  getTripStops,
  updateTripOfferSettings,
  updateTripWithStops,
} from '../../services/trip.service';
import { formatDateTime, formatMoney } from '../../utils/format';
import { buildTripStopsPayload, getTripStopLabel, validateTripStopSequence, type TripStopValidationMessages } from '../../utils/tripStops';

export function CompanyTripDetailsPage() {
  const { tripId = '' } = useParams();
  const queryClient = useQueryClient();
  const { messages } = useI18n();
  const company = useCompanyContext();
  const tripQuery = useQuery({ queryKey: ['trip', tripId], queryFn: () => getTripDetails(tripId), enabled: !!tripId });
  const stopsQuery = useQuery({ queryKey: ['trip-stops', tripId], queryFn: () => getTripStops(tripId), enabled: !!tripId });
  const manifestQuery = useQuery({ queryKey: ['trip-manifest', tripId], queryFn: () => getTripManifest(tripId), enabled: !!tripId });
  const bookingCountQuery = useQuery({ queryKey: ['trip-booking-count', tripId], queryFn: () => getTripBookingCount(tripId), enabled: !!tripId });
  const companyId = (tripQuery.data?.company_id as string | undefined) ?? company.data ?? undefined;
  const { data: cities = [] } = useCities();
  const [openEdit, setOpenEdit] = useState(false);
  const [form, setForm] = useState<any | null>(null);
  const [stopsForm, setStopsForm] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasBookings = (bookingCountQuery.data ?? 0) > 0;
  const busFilterCity = openEdit && form ? form.origin_city_id : tripQuery.data?.origin_city_id;
  const { data: buses = [] } = useBuses(companyId, {
    enabled: !!companyId && !!busFilterCity && openEdit && !hasBookings,
    originCityId: busFilterCity || null,
    statusOnlyAvailable: true,
  });
  const { data: drivers = [] } = useDrivers(companyId, { enabled: !!companyId });
  const { data: restStops = [] } = useRestStops(companyId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('Trip form is not ready.');

      if (hasBookings) {
        return updateTripOfferSettings(tripId, {
          offer_is: !!form.offer_is,
          price_offer: form.offer_is ? Number(form.price_offer) : null,
          title_offer: form.offer_is ? form.title_offer || null : null,
        });
      }

      const validationMessages = messages.company.trips.validation as unknown as TripStopValidationMessages;
      const validationError = validateTripStopSequence(
        {
          origin_city_id: form.origin_city_id,
          destination_city_id: form.destination_city_id,
          departure_datetime: form.departure_datetime,
          expected_arrival_datetime: form.expected_arrival_datetime,
          stops: stopsForm,
        },
        validationMessages,
      );

      if (validationError) throw new Error(validationError);

      return updateTripWithStops({
        trip_id: tripId,
        trip: {
          ...form,
          price_offer: form.offer_is ? Number(form.price_offer) : null,
          title_offer: form.offer_is ? form.title_offer : null,
        },
        stops: buildTripStopsPayload(stopsForm),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['trip-stops', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['trip-booking-count', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['trips'] }),
      ]);
      setOpenEdit(false);
      setError(null);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : messages.common.unexpectedError);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeTrip(tripId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['trip-manifest', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['trips'] }),
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      ]);
    },
  });

  const trip = tripQuery.data;
  const tripStops = stopsQuery.data ?? [];
  const manifest = manifestQuery.data ?? [];

  function openEditModal() {
    if (!trip) return;

    setForm({
      bus_id: trip.bus_id,
      driver_id: trip.driver?.id ?? trip.driver_id,
      origin_city_id: trip.origin_city_id,
      destination_city_id: trip.destination_city_id,
      departure_datetime: toInputDateTime(trip.departure_datetime),
      expected_arrival_datetime: toInputDateTime(trip.expected_arrival_datetime),
      price: trip.price,
      offer_is: !!trip.offer_is,
      price_offer: trip.price_offer,
      title_offer: trip.title_offer || '',
    });

    setStopsForm(
      tripStops.map((stop: any) => ({
        stop_type: stop.stop_type,
        city_id: stop.city_id,
        rest_stop_id: stop.rest_stop_id,
        time_arrival: stop.time_arrival ? toInputDateTime(stop.time_arrival) : '',
        time_departure: stop.time_departure ? toInputDateTime(stop.time_departure) : '',
        is_boarding_allowed: !!stop.is_boarding_allowed,
        is_dropoff_allowed: !!stop.is_dropoff_allowed,
      })),
    );
    setError(null);
    setOpenEdit(true);
  }

  if (tripQuery.isPending || stopsQuery.isPending) {
    return <div className="grid min-h-[40vh] place-items-center text-bolman-purple">{messages.common.loading}</div>;
  }

  if (!trip) {
    return (
      <Card>
        <CardTitle>{messages.company.trips.tripNotFoundTitle}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.company.trips.tripNotFoundBody}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${trip.origin?.name} - ${trip.destination?.name}`}
        subtitle={`Bus ${trip.bus?.number_bus || '-'} • Driver ${trip.driver?.user?.full_name || '-'}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={openEditModal}>{messages.company.trips.editTrip}</Button>
            <Button
              variant="mint"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending || trip.status === 'completed' || trip.status === 'cancelled'}
            >
              {messages.company.trips.completeTrip}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>{messages.company.trips.detailStatus}</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{messages.common.status}</span>
              <StatusBadge value={trip.status} />
            </div>
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.detailDeparture}</span>
              <span>{formatDateTime(trip.departure_datetime)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.detailExpectedArrival}</span>
              <span>{formatDateTime(trip.expected_arrival_datetime)}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>{messages.common.price}</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.basePriceLabel}</span>
              <span>{formatMoney(trip.price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.offerLabel}</span>
              <span>{trip.offer_is ? formatMoney(trip.price_offer) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.bookingsCountLabel}</span>
              <span>{bookingCountQuery.data ?? 0}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>{messages.company.trips.assignmentsCard}</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.busLabel}</span>
              <span>{trip.bus?.number_bus || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.driverLabel}</span>
              <span>{trip.driver?.user?.full_name || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{messages.company.trips.companyLabel}</span>
              <span>{trip.company?.name || '-'}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{messages.company.trips.stopsCardTitle}</CardTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tripStops.map((stop: any) => (
            <div key={stop.id} className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-bolman-borderDark">
              <div className="font-bold text-slate-900 dark:text-white">
                {stop.order_stop}. {getTripStopLabel(stop)}
              </div>
              <div className="mt-2 text-slate-500 dark:text-slate-400">
                {stop.stop_type === 'rest_stop' ? messages.company.trips.stopKindRest : messages.company.trips.stopKindCity}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{messages.company.trips.boardingShort}: {stop.is_boarding_allowed ? messages.common.yes : messages.common.no}</span>
                <span>{messages.company.trips.dropoffShort}: {stop.is_dropoff_allowed ? messages.common.yes : messages.common.no}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {messages.company.trips.arrivalDepartureLine}: {stop.time_arrival ? formatDateTime(stop.time_arrival) : '-'} | {stop.time_departure ? formatDateTime(stop.time_departure) : '-'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>{messages.company.trips.manifestTitle}</CardTitle>
        <div className="mt-4">
          <DataTable
            columns={messages.company.trips.manifestColumns as unknown as string[]}
            loading={manifestQuery.isPending}
            empty={!manifestQuery.isPending && !manifest.length}
          >
            {manifest.map((row: any) => (
              <tr key={`${row.ticket_id || row.booking_id}-${row.passenger_id}`}>
                <Td className="font-semibold">{row.passenger_name}</Td>
                <Td>{row.passenger_phone || '-'}</Td>
                <Td>{row.national_id || '-'}</Td>
                <Td>{row.seat_number ?? '-'}</Td>
                <Td><StatusBadge value={row.ticket_status} /></Td>
                <Td>{row.boarded_at ? formatDateTime(row.boarded_at) : '-'}</Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Card>

      <Modal open={openEdit} onClose={() => !saveMutation.isPending && setOpenEdit(false)} title={messages.company.trips.editTrip}>
        {form ? (
          <div className="grid gap-4">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {hasBookings ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {messages.company.trips.tripHasBookingsOfferOnly}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={messages.company.trips.originCity}>
                    <Select value={form.origin_city_id} onChange={(e) => setForm({ ...form, origin_city_id: e.target.value })}>
                      <option value="">{messages.common.choose}</option>
                      {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
                    </Select>
                  </Field>
                  <Field label={messages.company.trips.destinationCity}>
                    <Select value={form.destination_city_id} onChange={(e) => setForm({ ...form, destination_city_id: e.target.value })}>
                      <option value="">{messages.common.choose}</option>
                      {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
                    </Select>
                  </Field>
                  <Field label={messages.common.bus}>
                    <Select value={form.bus_id} onChange={(e) => setForm({ ...form, bus_id: e.target.value })}>
                      <option value="">{messages.common.choose}</option>
                      {buses.map((bus: any) => <option key={bus.id} value={bus.id}>{bus.number_bus}</option>)}
                    </Select>
                  </Field>
                  <Field label={messages.common.driver}>
                    <Select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
                      <option value="">{messages.common.choose}</option>
                      {drivers.map((driver: any) => <option key={driver.id} value={driver.id}>{driver.user?.full_name}</option>)}
                    </Select>
                  </Field>
                  <Field label={messages.company.trips.departureTime}>
                    <Input type="datetime-local" value={form.departure_datetime} onChange={(e) => setForm({ ...form, departure_datetime: e.target.value })} />
                  </Field>
                  <Field label={messages.company.trips.expectedArrival}>
                    <Input type="datetime-local" value={form.expected_arrival_datetime} onChange={(e) => setForm({ ...form, expected_arrival_datetime: e.target.value })} />
                  </Field>
                  <Field label={messages.common.price}>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                  </Field>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{messages.company.trips.tripStops}</div>
                  {stopsForm.map((stop, index) => (
                    <div key={`stop-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-bolman-surfaceDark md:grid-cols-5">
                      <Select value={stop.stop_type} onChange={(e) => setStopsForm(stopsForm.map((item, itemIndex) => itemIndex === index ? { ...item, stop_type: e.target.value } : item))}>
                        <option value="city">{messages.tripStopType.city}</option>
                        <option value="rest_stop">{messages.tripStopType.restStop}</option>
                      </Select>
                      {stop.stop_type === 'city' ? (
                        <Select
                          value={stop.city_id || ''}
                          onChange={(e) => setStopsForm(stopsForm.map((item, itemIndex) => itemIndex === index ? { ...item, city_id: e.target.value, rest_stop_id: null } : item))}
                        >
                          <option value="">{messages.company.trips.chooseCity}</option>
                          {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
                        </Select>
                      ) : (
                        <Select
                          value={stop.rest_stop_id || ''}
                          onChange={(e) => setStopsForm(stopsForm.map((item, itemIndex) => itemIndex === index ? { ...item, rest_stop_id: e.target.value, city_id: null } : item))}
                        >
                          <option value="">{messages.company.trips.chooseRestStop}</option>
                          {restStops.map((rest: any) => <option key={rest.id} value={rest.id}>{rest.name}</option>)}
                        </Select>
                      )}
                      <Input type="datetime-local" value={stop.time_arrival || ''} onChange={(e) => setStopsForm(stopsForm.map((item, itemIndex) => itemIndex === index ? { ...item, time_arrival: e.target.value } : item))} />
                      <Input type="datetime-local" value={stop.time_departure || ''} onChange={(e) => setStopsForm(stopsForm.map((item, itemIndex) => itemIndex === index ? { ...item, time_departure: e.target.value } : item))} />
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={!!stop.is_boarding_allowed}
                            onChange={(e) => setStopsForm(stopsForm.map((item, itemIndex) => itemIndex === index ? { ...item, is_boarding_allowed: e.target.checked } : item))}
                          />
                          {messages.company.trips.boardingAllowed}
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={!!stop.is_dropoff_allowed}
                            onChange={(e) => setStopsForm(stopsForm.map((item, itemIndex) => itemIndex === index ? { ...item, is_dropoff_allowed: e.target.checked } : item))}
                          />
                          {messages.company.trips.dropoffAllowed}
                        </label>
                        <Button variant="secondary" onClick={() => setStopsForm(stopsForm.filter((_, itemIndex) => itemIndex !== index))}>
                          {messages.common.remove}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={() => setStopsForm([...stopsForm, { stop_type: 'city', city_id: '', is_boarding_allowed: true, is_dropoff_allowed: true }])}>
                    {messages.company.trips.addStop}
                  </Button>
                </div>
              </>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.offer_is} onChange={(e) => setForm({ ...form, offer_is: e.target.checked })} />
                {messages.company.trips.addToOffers}
              </label>
              {form.offer_is ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={messages.company.trips.offerTitle}>
                    <Input value={form.title_offer} onChange={(e) => setForm({ ...form, title_offer: e.target.value })} />
                  </Field>
                  <Field label={messages.company.trips.offerPrice}>
                    <Input type="number" value={form.price_offer ?? ''} onChange={(e) => setForm({ ...form, price_offer: Number(e.target.value) })} />
                  </Field>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpenEdit(false)} disabled={saveMutation.isPending}>
                {messages.common.close}
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? messages.common.loading : messages.common.save}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
