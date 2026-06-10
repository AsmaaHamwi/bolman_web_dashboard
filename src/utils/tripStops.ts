export type TripStopShape = {
  id?: string;
  stop_type: 'city' | 'rest_stop';
  city_id?: string | null;
  rest_stop_id?: string | null;
  city?: { name?: string | null } | null;
  rest_stop?: { name?: string | null } | null;
  order_stop: number;
  time_arrival?: string | null;
  time_departure?: string | null;
  is_boarding_allowed: boolean;
  is_dropoff_allowed: boolean;
};

export type TripStopValidationMessages = {
  originDestinationRequired: string;
  departureArrivalRequired: string;
  arrivalAfterDeparture: string;
  minTwoStops: string;
  firstStopOrigin: string;
  lastStopDestination: string;
  cityStopNeedsCity: string;
  restStopNeedsRest: string;
  stopTimesOrder: string;
};

const defaultValidationMessages: TripStopValidationMessages = {
  originDestinationRequired: 'Origin and destination are required.',
  departureArrivalRequired: 'Departure and expected arrival are required.',
  arrivalAfterDeparture: 'Expected arrival must be after departure.',
  minTwoStops: 'At least two stops are required.',
  firstStopOrigin: 'The first stop must match the origin city.',
  lastStopDestination: 'The last stop must match the destination city.',
  cityStopNeedsCity: 'Each city stop must have a city selected.',
  restStopNeedsRest: 'Each rest stop must have a rest stop selected.',
  stopTimesOrder: 'Stop times must be in chronological order.',
};

export function getTripStopLabel(stop: Partial<TripStopShape>) {
  if (stop.stop_type === 'rest_stop') {
    return stop.rest_stop?.name || 'Rest stop';
  }

  return stop.city?.name || 'City';
}

export function getBoardingStops<T extends TripStopShape>(stops: T[]) {
  return stops.filter((stop) => stop.is_boarding_allowed).sort((left, right) => left.order_stop - right.order_stop);
}

export function getDropoffStops<T extends TripStopShape>(stops: T[], fromStopId?: string | null) {
  const fromStop = fromStopId ? stops.find((stop) => stop.id === fromStopId) : null;

  return stops
    .filter((stop) => stop.is_dropoff_allowed && (!fromStop || stop.order_stop > fromStop.order_stop))
    .sort((left, right) => left.order_stop - right.order_stop);
}

export function buildTripStopsPayload(stops: Array<Omit<TripStopShape, 'order_stop'>>) {
  return stops.map((stop, index) => ({
    stop_type: stop.stop_type,
    city_id: stop.stop_type === 'city' ? stop.city_id || null : null,
    rest_stop_id: stop.stop_type === 'rest_stop' ? stop.rest_stop_id || null : null,
    order_stop: index + 1,
    time_arrival: stop.time_arrival || null,
    time_departure: stop.time_departure || null,
    is_boarding_allowed: !!stop.is_boarding_allowed,
    is_dropoff_allowed: !!stop.is_dropoff_allowed,
  }));
}

export function validateTripStopSequence(
  input: {
    origin_city_id: string;
    destination_city_id: string;
    departure_datetime: string;
    expected_arrival_datetime: string;
    stops: Array<Omit<TripStopShape, 'order_stop'>>;
  },
  messages?: Partial<TripStopValidationMessages>,
) {
  const m = { ...defaultValidationMessages, ...messages };
  const { origin_city_id, destination_city_id, departure_datetime, expected_arrival_datetime, stops } = input;

  if (!origin_city_id || !destination_city_id) return m.originDestinationRequired;
  if (!departure_datetime || !expected_arrival_datetime) return m.departureArrivalRequired;
  if (new Date(expected_arrival_datetime).getTime() <= new Date(departure_datetime).getTime()) {
    return m.arrivalAfterDeparture;
  }
  if (stops.length < 2) return m.minTwoStops;

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  if (firstStop.stop_type !== 'city' || firstStop.city_id !== origin_city_id) {
    return m.firstStopOrigin;
  }

  if (lastStop.stop_type !== 'city' || lastStop.city_id !== destination_city_id) {
    return m.lastStopDestination;
  }

  let previousMoment = new Date(departure_datetime).getTime();

  for (const stop of stops) {
    if (stop.stop_type === 'city' && !stop.city_id) return m.cityStopNeedsCity;
    if (stop.stop_type === 'rest_stop' && !stop.rest_stop_id) return m.restStopNeedsRest;

    if (stop.time_arrival) {
      const arrivalTime = new Date(stop.time_arrival).getTime();
      if (arrivalTime < previousMoment) return m.stopTimesOrder;
      previousMoment = arrivalTime;
    }

    if (stop.time_departure) {
      const departureTime = new Date(stop.time_departure).getTime();
      if (departureTime < previousMoment) return m.stopTimesOrder;
      previousMoment = departureTime;
    }
  }

  return null;
}
