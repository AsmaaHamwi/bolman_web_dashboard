import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useBuses, useDrivers, useRestStops } from '../../hooks/useFleet';
import { useCities } from '../../hooks/useCities';
import { useCreateTrip } from '../../hooks/useTrips';
import { buildTripStopsPayload, validateTripStopSequence, type TripStopValidationMessages } from '../../utils/tripStops';

type MiddleStopDraft = {
  stop_type: 'city' | 'rest_stop';
  city_id: string;
  rest_stop_id: string | null;
  time_arrival: string;
  time_departure: string;
  is_boarding_allowed: boolean;
  is_dropoff_allowed: boolean;
};

function newMiddleStop(): MiddleStopDraft {
  return {
    stop_type: 'city',
    city_id: '',
    rest_stop_id: null,
    time_arrival: '',
    time_departure: '',
    is_boarding_allowed: true,
    is_dropoff_allowed: true,
  };
}

function noBusesAvailableMessage(
  messages: { noAvailableBusesInOrigin: string; noAvailableBusesInOriginNamed: string },
  originCityId: string,
  originCityDisplayName: string,
) {
  if (!originCityId || originCityDisplayName === '-') {
    return messages.noAvailableBusesInOrigin;
  }
  return messages.noAvailableBusesInOriginNamed.replace(/\{\{city\}\}/g, originCityDisplayName);
}

export function CreateTripPage() {
  const navigate = useNavigate();
  const { messages } = useI18n();
  const { data: companyId } = useCompanyContext();
  const { data: cities = [] } = useCities();
  const [trip, setTrip] = useState<any>({
    origin_city_id: '',
    destination_city_id: '',
    bus_id: '',
    driver_id: '',
    departure_datetime: '',
    expected_arrival_datetime: '',
    price: 0,
    offer_is: false,
    price_offer: null,
    title_offer: '',
  });
  const [middleStops, setMiddleStops] = useState<MiddleStopDraft[]>([]);
  const { data: buses = [] } = useBuses(companyId, {
    enabled: !!companyId && !!trip.origin_city_id,
    originCityId: trip.origin_city_id || null,
    statusOnlyAvailable: true,
  });
  const { data: drivers = [] } = useDrivers(companyId, { enabled: !!companyId });
  const { data: rests = [] } = useRestStops(companyId);
  const create = useCreateTrip();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTrip((t: any) => ({ ...t, bus_id: '' }));
  }, [trip.origin_city_id]);

  const validationMessages = messages.company.trips.validation as unknown as TripStopValidationMessages;

  const composedStops = useMemo(() => {
    if (!trip.origin_city_id || !trip.destination_city_id) return [];
    const first = {
      stop_type: 'city' as const,
      city_id: trip.origin_city_id,
      rest_stop_id: null,
      time_arrival: null as string | null,
      time_departure: trip.departure_datetime || null,
      is_boarding_allowed: true,
      is_dropoff_allowed: false,
    };
    const last = {
      stop_type: 'city' as const,
      city_id: trip.destination_city_id,
      rest_stop_id: null,
      time_arrival: trip.expected_arrival_datetime || null,
      time_departure: null as string | null,
      is_boarding_allowed: false,
      is_dropoff_allowed: true,
    };
    return [first, ...middleStops, last];
  }, [
    trip.origin_city_id,
    trip.destination_city_id,
    trip.departure_datetime,
    trip.expected_arrival_datetime,
    middleStops,
  ]);

  const originCityName = cities.find((c: any) => c.id === trip.origin_city_id)?.name ?? '-';
  const destCityName = cities.find((c: any) => c.id === trip.destination_city_id)?.name ?? '-';
  const tripsBusMessages = messages.company.trips;
  const noBusesMsg = () =>
    noBusesAvailableMessage(
      {
        noAvailableBusesInOrigin: tripsBusMessages.noAvailableBusesInOrigin,
        noAvailableBusesInOriginNamed: tripsBusMessages.noAvailableBusesInOriginNamed,
      },
      trip.origin_city_id,
      originCityName,
    );

  async function submit() {
    if (!companyId) return;

    if (!trip.origin_city_id) {
      setError(validationMessages.originDestinationRequired);
      return;
    }

    if (!buses.length) {
      setError(noBusesMsg());
      return;
    }

    if (!trip.bus_id || !buses.some((b: any) => b.id === trip.bus_id)) {
      setError(noBusesMsg());
      return;
    }

    const validationError = validateTripStopSequence(
      {
        origin_city_id: trip.origin_city_id,
        destination_city_id: trip.destination_city_id,
        departure_datetime: trip.departure_datetime,
        expected_arrival_datetime: trip.expected_arrival_datetime,
        stops: composedStops,
      },
      validationMessages,
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    await create.mutateAsync({
      trip: {
        ...trip,
        company_id: companyId,
        price_offer: trip.offer_is ? Number(trip.price_offer) : null,
        title_offer: trip.offer_is ? trip.title_offer : null,
      },
      stops: buildTripStopsPayload(composedStops),
    });
    navigate('/company/trips');
  }

  return (
    <div>
      <PageHeader title={messages.company.trips.createTitle} subtitle={messages.company.trips.createSubtitle} />
      <div className="grid gap-5 xl:grid-cols-3">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 xl:col-span-3 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}
        <Card className="xl:col-span-2">
          <CardTitle>{messages.company.trips.tripDetails}</CardTitle>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={messages.company.trips.originCity}>
              <Select
                value={trip.origin_city_id}
                onChange={(e) => setTrip({ ...trip, origin_city_id: e.target.value })}
              >
                <option value="">{messages.common.choose}</option>
                {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </Select>
            </Field>
            <Field label={messages.company.trips.destinationCity}>
              <Select
                value={trip.destination_city_id}
                onChange={(e) => setTrip({ ...trip, destination_city_id: e.target.value })}
              >
                <option value="">{messages.common.choose}</option>
                {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </Select>
            </Field>
            <Field label={messages.common.bus}>
              <Select value={trip.bus_id} onChange={(e) => setTrip({ ...trip, bus_id: e.target.value })} disabled={!trip.origin_city_id}>
                <option value="">{messages.common.choose}</option>
                {buses.map((bus: any) => <option key={bus.id} value={bus.id}>{bus.number_bus}</option>)}
              </Select>
            </Field>
            <Field label={messages.common.driver}>
              <Select value={trip.driver_id} onChange={(e) => setTrip({ ...trip, driver_id: e.target.value })}>
                <option value="">{messages.common.choose}</option>
                {drivers.map((driver: any) => <option key={driver.id} value={driver.id}>{driver.user?.full_name}</option>)}
              </Select>
            </Field>
            <Field label={messages.company.trips.departureTime}>
              <Input type="datetime-local" value={trip.departure_datetime} onChange={(e) => setTrip({ ...trip, departure_datetime: e.target.value })} />
            </Field>
            <Field label={messages.company.trips.expectedArrival}>
              <Input type="datetime-local" value={trip.expected_arrival_datetime} onChange={(e) => setTrip({ ...trip, expected_arrival_datetime: e.target.value })} />
            </Field>
            <Field label={messages.common.price}>
              <Input type="number" value={trip.price} onChange={(e) => setTrip({ ...trip, price: Number(e.target.value) })} />
            </Field>
          </div>
          {trip.origin_city_id && !buses.length ? (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">{noBusesMsg()}</p>
          ) : null}
        </Card>
        <Card>
          <CardTitle>{messages.company.trips.offerSection}</CardTitle>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={trip.offer_is} onChange={(e) => setTrip({ ...trip, offer_is: e.target.checked })} />
            {messages.company.trips.addToOffers}
          </label>
          {trip.offer_is && (
            <div className="mt-4 space-y-3">
              <Field label={messages.company.trips.offerTitle}>
                <Input value={trip.title_offer} onChange={(e) => setTrip({ ...trip, title_offer: e.target.value })} />
              </Field>
              <Field label={messages.company.trips.offerPrice}>
                <Input type="number" value={trip.price_offer ?? ''} onChange={(e) => setTrip({ ...trip, price_offer: Number(e.target.value) })} />
              </Field>
            </div>
          )}
          <Button className="mt-5 w-full" onClick={submit}>{messages.company.trips.saveTrip}</Button>
        </Card>
        <Card className="xl:col-span-3">
          <CardTitle>{messages.company.trips.tripStops}</CardTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark">
              <div className="text-xs font-bold uppercase text-slate-500">{messages.company.trips.originCity}</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-white">{originCityName}</div>
              <div className="mt-2 text-xs text-slate-500">{messages.company.trips.departureTime}</div>
              <div className="font-mono text-sm">{trip.departure_datetime || '—'}</div>
              <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{messages.company.trips.boardingAllowed}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark">
              <div className="text-xs font-bold uppercase text-slate-500">{messages.company.trips.destinationCity}</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-white">{destCityName}</div>
              <div className="mt-2 text-xs text-slate-500">{messages.company.trips.expectedArrival}</div>
              <div className="font-mono text-sm">{trip.expected_arrival_datetime || '—'}</div>
              <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{messages.company.trips.dropoffAllowed}</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {middleStops.map((stop, index) => (
              <div key={`mid-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-bolman-surfaceDark md:grid-cols-5">
                <Select
                  value={stop.stop_type}
                  onChange={(e) =>
                    setMiddleStops(middleStops.map((item, itemIndex) => (itemIndex === index ? { ...item, stop_type: e.target.value as 'city' | 'rest_stop' } : item)))
                  }
                >
                  <option value="city">{messages.tripStopType.city}</option>
                  <option value="rest_stop">{messages.tripStopType.restStop}</option>
                </Select>
                {stop.stop_type === 'city' ? (
                  <Select
                    value={stop.city_id || ''}
                    onChange={(e) =>
                      setMiddleStops(middleStops.map((item, itemIndex) => (itemIndex === index ? { ...item, city_id: e.target.value, rest_stop_id: null } : item)))
                    }
                  >
                    <option value="">{messages.company.trips.chooseCity}</option>
                    {cities.map((city: any) => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </Select>
                ) : (
                  <Select
                    value={stop.rest_stop_id || ''}
                    onChange={(e) =>
                      setMiddleStops(middleStops.map((item, itemIndex) => (itemIndex === index ? { ...item, rest_stop_id: e.target.value, city_id: '' } : item)))
                    }
                  >
                    <option value="">{messages.company.trips.chooseRestStop}</option>
                    {rests.map((rest: any) => <option key={rest.id} value={rest.id}>{rest.name}</option>)}
                  </Select>
                )}
                <Input type="datetime-local" value={stop.time_arrival || ''} onChange={(e) => setMiddleStops(middleStops.map((item, itemIndex) => (itemIndex === index ? { ...item, time_arrival: e.target.value } : item)))} />
                <Input type="datetime-local" value={stop.time_departure || ''} onChange={(e) => setMiddleStops(middleStops.map((item, itemIndex) => (itemIndex === index ? { ...item, time_departure: e.target.value } : item)))} />
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!stop.is_boarding_allowed}
                      onChange={(e) =>
                        setMiddleStops(middleStops.map((item, itemIndex) => (itemIndex === index ? { ...item, is_boarding_allowed: e.target.checked } : item)))
                      }
                    />
                    {messages.company.trips.boardingAllowed}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!stop.is_dropoff_allowed}
                      onChange={(e) =>
                        setMiddleStops(middleStops.map((item, itemIndex) => (itemIndex === index ? { ...item, is_dropoff_allowed: e.target.checked } : item)))
                      }
                    />
                    {messages.company.trips.dropoffAllowed}
                  </label>
                  <Button variant="secondary" onClick={() => setMiddleStops(middleStops.filter((_, itemIndex) => itemIndex !== index))}>
                    {messages.common.remove}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => setMiddleStops([...middleStops, newMiddleStop()])}>
            {messages.company.trips.addMiddleStop}
          </Button>
        </Card>
      </div>
    </div>
  );
}
