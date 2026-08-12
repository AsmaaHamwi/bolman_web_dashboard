import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Clock,
  MapPin,
  Sparkles,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Armchair,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SeatMap } from '../../components/booking/SeatMap';
import { TripRouteSearchForm } from '../../components/booking/TripRouteSearchForm';
import { PassengerBookerPicker } from '../../components/booking/PassengerBookerPicker';
import { useI18n } from '../../hooks/useI18n';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useCities } from '../../hooks/useCities';
import { useSearchTrips } from '../../hooks/useTrips';
import { useSeatStatus } from '../../hooks/useSeats';
import { confirmOfficeCashBooking } from '../../services/booking.service';
import type { WalletPassengerSearchResult } from '../../services/wallet.service';
import type { TripSearchRow } from '../../types/domain';
import {
  cx,
  formatDateTime,
  formatMoney,
  formatTime,
  formatTripDuration,
  getLocalDateInputValue,
} from '../../utils/format';
import {
  isValidName,
  isValidPositiveDigits,
  sanitizeName,
  sanitizePositiveDigits,
} from '../../utils/validation';

export function ManualBookingPage() {
  const { data: companyId } = useCompanyContext();
  const { messages, isArabic } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cities = [] } = useCities();

  // Search parameters
  const [originCityId, setOriginCityId] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [travelDate, setTravelDate] = useState(getLocalDateInputValue());
  const [sortMode, setSortMode] = useState<'soonest' | 'cheapest'>('soonest');

  // Selected trip state
  const [selectedTrip, setSelectedTrip] = useState<TripSearchRow | null>(null);

  // Booking details state
  const [ticketMode, setTicketMode] = useState<'group' | 'individual'>('group');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedBooker, setSelectedBooker] = useState<WalletPassengerSearchResult | null>(null);
  const [passengers, setPassengers] = useState<
    Array<{ full_name: string; phone: string; national_id: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useMemo(() => {
    if (!originCityId || !destinationCityId || !travelDate || originCityId === destinationCityId) {
      return undefined;
    }
    return {
      origin_city_id: originCityId,
      destination_city_id: destinationCityId,
      travel_date: travelDate,
    };
  }, [originCityId, destinationCityId, travelDate]);

  const { data: rawTrips = [], isPending: isSearchingTrips } = useSearchTrips(searchParams);

  // Filter trips by company if within company context
  const filteredTrips = useMemo(() => {
    let list = (rawTrips ?? []) as TripSearchRow[];
    if (companyId) {
      list = list.filter((t) => t.company_id === companyId);
    }
    return list;
  }, [rawTrips, companyId]);

  // Sort trips
  const sortedTrips = useMemo(() => {
    const list = [...filteredTrips];
    if (sortMode === 'cheapest') {
      return list.sort((a, b) => Number(a.final_price ?? 0) - Number(b.final_price ?? 0));
    }
    return list.sort(
      (a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime(),
    );
  }, [filteredTrips, sortMode]);

  // Cheapest trip ID for badge
  const bestPriceTripId = useMemo(() => {
    if (filteredTrips.length <= 1) return null;
    let lowestId = filteredTrips[0]?.trip_id;
    let lowestPrice = Number(filteredTrips[0]?.final_price ?? Infinity);
    for (const trip of filteredTrips) {
      const price = Number(trip.final_price ?? Infinity);
      if (price < lowestPrice) {
        lowestPrice = price;
        lowestId = trip.trip_id;
      }
    }
    return lowestId;
  }, [filteredTrips]);

  // Seat status query for selected trip
  const seatParams = useMemo(() => {
    if (!selectedTrip) return undefined;
    return {
      tripId: selectedTrip.trip_id,
      fromTripStopId: selectedTrip.from_trip_stop_id,
      toTripStopId: selectedTrip.to_trip_stop_id,
    };
  }, [selectedTrip]);

  const { data: seats = [] } = useSeatStatus(seatParams);

  // Sync passengers count with selected seats
  useEffect(() => {
    const n = selectedSeats.length;
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
  }, [selectedSeats.length]);

  const confirm = useMutation({
    mutationFn: confirmOfficeCashBooking,
    onSuccess: async (bookingId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['seat-status'] }),
        queryClient.invalidateQueries({ queryKey: ['trip-booking-count', selectedTrip?.trip_id] }),
        queryClient.invalidateQueries({ queryKey: ['trip-search'] }),
      ]);
      setError(null);
      navigate(`/company/bookings/${bookingId}`);
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : messages.common.unexpectedError,
      );
    },
  });

  const isZeroPriceTrip = !!(
    selectedTrip &&
    Number(selectedTrip.final_price ?? selectedTrip.base_price ?? 0) <= 0
  );

  const canSubmit =
    !!selectedTrip &&
    !isZeroPriceTrip &&
    selectedSeats.length > 0 &&
    passengers.length === selectedSeats.length &&
    passengers.every(
      (p) =>
        isValidName(p.full_name) &&
        isValidPositiveDigits(p.national_id) &&
        (!p.phone?.trim() || isValidPositiveDigits(p.phone)),
    );

  const copy = messages.company.manualBooking;

  const handleSwapCities = () => {
    setOriginCityId(destinationCityId);
    setDestinationCityId(originCityId);
    setSelectedTrip(null);
    setSelectedSeats([]);
  };

  const handleOriginChange = (id: string) => {
    setOriginCityId(id);
    setSelectedTrip(null);
    setSelectedSeats([]);
  };

  const handleDestinationChange = (id: string) => {
    setDestinationCityId(id);
    setSelectedTrip(null);
    setSelectedSeats([]);
  };

  const handleTravelDateChange = (date: string) => {
    setTravelDate(date);
    setSelectedTrip(null);
    setSelectedSeats([]);
  };

  const handleSelectTrip = (trip: TripSearchRow) => {
    setSelectedTrip(trip);
    setSelectedSeats([]);
  };

  const handleResetTrip = () => {
    setSelectedTrip(null);
    setSelectedSeats([]);
  };

  const totalBookingPrice = (selectedTrip?.final_price ?? 0) * selectedSeats.length;

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={20} className="shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      ) : null}

      {/* STEP 1: Search Form */}
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-bolman-borderDark">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bolman-purple/10 text-bolman-purple">
              <Bus size={22} />
            </div>
            <div>
              <CardTitle>{copy.searchSection}</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">{copy.searchGuidance}</p>
            </div>
          </div>
          {selectedTrip ? (
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={handleResetTrip}>
              {copy.changeTrip}
            </Button>
          ) : null}
        </div>

        <div className="mt-4">
          <TripRouteSearchForm
            cities={cities}
            originCityId={originCityId}
            destinationCityId={destinationCityId}
            travelDate={travelDate}
            onOriginChange={handleOriginChange}
            onDestinationChange={handleDestinationChange}
            onTravelDateChange={handleTravelDateChange}
            onSwap={handleSwapCities}
          />
        </div>
      </Card>

      {/* STEP 2: Trip Search Results / Selected Trip Banner */}
      {!selectedTrip ? (
        <div className="space-y-4">
          {/* Validation & Search Status Messages */}
          {!originCityId || !destinationCityId ? (
            <Card className="border-dashed text-center py-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-bolman-surfaceDark text-slate-400">
                <MapPin size={28} />
              </div>
              <h3 className="mt-3 text-base font-extrabold text-slate-800 dark:text-slate-200">
                {copy.searchGuidance}
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                حدد مدينة الانطلاق ومدينة الوصول والتاريخ لعرض قائمة الرحلات المتاحة بدقة وسرعة.
              </p>
            </Card>
          ) : originCityId === destinationCityId ? (
            <Card className="border-amber-200 bg-amber-50/50 text-center py-8 dark:border-amber-500/20 dark:bg-amber-500/5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertCircle size={24} />
              </div>
              <h3 className="mt-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                {copy.sameCitiesError}
              </h3>
            </Card>
          ) : isSearchingTrips ? (
            /* Loading Skeletons */
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-bolman-borderDark dark:bg-bolman-cardDark"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-bolman-borderDark">
                    <div className="h-5 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="h-10 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-10 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedTrips.length === 0 ? (
            /* No Trips Found */
            <Card className="text-center py-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-bolman-surfaceDark text-slate-400">
                <Bus size={28} />
              </div>
              <h3 className="mt-3 text-base font-extrabold text-slate-800 dark:text-slate-200">
                {copy.noTripsFound}
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                {copy.noTripsFoundHint}
              </p>
            </Card>
          ) : (
            /* Available Trips List (Passenger App Style) */
            <div className="space-y-3">
              {/* Header with results count and sort tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{copy.availableTrips}</span>
                  <span className="rounded-full bg-bolman-purple/10 px-2.5 py-0.5 text-xs font-bold text-bolman-purple">
                    {sortedTrips.length}
                  </span>
                </h3>

                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark">
                  <button
                    type="button"
                    onClick={() => setSortMode('soonest')}
                    className={cx(
                      'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                      sortMode === 'soonest'
                        ? 'bg-white text-bolman-purple shadow-sm dark:bg-bolman-cardDark dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                    )}
                  >
                    <Clock size={14} />
                    <span>{copy.sortSoonest}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode('cheapest')}
                    className={cx(
                      'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                      sortMode === 'cheapest'
                        ? 'bg-white text-bolman-purple shadow-sm dark:bg-bolman-cardDark dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                    )}
                  >
                    <TrendingDown size={14} />
                    <span>{copy.sortCheapest}</span>
                  </button>
                </div>
              </div>

              {/* Trip Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {sortedTrips.map((trip) => {
                  const isOffer = !!(trip.offer_is && trip.final_price < trip.base_price);
                  const isBestPrice = bestPriceTripId === trip.trip_id;
                  const duration = formatTripDuration(trip.departure_time, trip.arrival_time);
                  const availableSeats = Number(trip.available_seats_count ?? 0);

                  return (
                    <div
                      key={trip.trip_id}
                      className={cx(
                        'group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-bolman-cardDark',
                        'border-slate-200/90 dark:border-bolman-borderDark hover:border-bolman-purple/50 dark:hover:border-bolman-purple/50',
                      )}
                    >
                      {/* Top Bar: Company & Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-bolman-borderDark">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bolman-purple/10 text-bolman-purple dark:bg-bolman-purple/20">
                              <Bus size={18} />
                            </div>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {trip.company_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {isOffer ? (
                              <Badge tone="purple">
                                <Sparkles size={12} className="me-1 inline" />
                                {trip.title_offer || copy.offerBadge}
                              </Badge>
                            ) : null}
                            {isBestPrice ? (
                              <Badge tone="green">
                                <TrendingDown size={12} className="me-1 inline" />
                                {copy.bestPrice}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        {/* Route Timeline & Times */}
                        <div className="my-4 flex items-center justify-between gap-3">
                          {/* Departure */}
                          <div className="text-start">
                            <p className="text-lg font-black text-slate-900 dark:text-white">
                              {formatTime(trip.departure_time)}
                            </p>
                            <p className="text-xs font-bold text-bolman-purple flex items-center gap-1 mt-0.5">
                              <MapPin size={12} />
                              <span>{trip.from_city_name}</span>
                            </p>
                          </div>

                          {/* Duration line & arrow */}
                          <div className="flex flex-1 flex-col items-center px-2">
                            {duration ? (
                              <span className="mb-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-bolman-surfaceDark dark:text-slate-300">
                                {duration}
                              </span>
                            ) : null}
                            <div className="relative flex w-full items-center justify-center">
                              <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
                              <div className="absolute rounded-full bg-white p-1 text-slate-400 dark:bg-bolman-cardDark">
                                {isArabic ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                              </div>
                            </div>
                          </div>

                          {/* Arrival */}
                          <div className="text-end">
                            <p className="text-lg font-black text-slate-900 dark:text-white">
                              {formatTime(trip.arrival_time)}
                            </p>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                              <MapPin size={12} />
                              <span>{trip.to_city_name}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Bar: Seats, Price, Select Action */}
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-bolman-borderDark">
                        {/* Seat availability badge */}
                        <div>
                          {availableSeats > 5 ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                              <Armchair size={14} />
                              <span>
                                {availableSeats} {copy.availableSeatsCount}
                              </span>
                            </span>
                          ) : availableSeats > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                              <Armchair size={14} />
                              <span>
                                {availableSeats} {copy.availableSeatsCount}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                              {copy.noSeatsAvailable}
                            </span>
                          )}
                        </div>

                        {/* Price & Select Button */}
                        <div className="flex items-center gap-3">
                          <div className="text-end">
                            {isOffer ? (
                              <p className="text-[11px] font-bold text-slate-400 line-through">
                                {formatMoney(trip.base_price)}
                              </p>
                            ) : null}
                            <p className="text-base font-black text-bolman-purple dark:text-bolman-purple">
                              {formatMoney(trip.final_price)}
                            </p>
                          </div>

                          <Button
                            disabled={availableSeats <= 0}
                            onClick={() => handleSelectTrip(trip)}
                            className="shrink-0 px-3.5 py-2 text-xs"
                          >
                            {copy.selectTrip}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 3: Selected Trip Summary Banner */
        <div className="rounded-3xl border border-bolman-purple/30 bg-gradient-to-r from-bolman-purple/10 via-bolman-purple/5 to-transparent p-5 dark:border-bolman-purple/40 dark:from-bolman-purple/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bolman-purple text-white shadow-glow">
                <Bus size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-bolman-purple px-2 py-0.5 text-[11px] font-black text-white">
                    {copy.selectedTripBadge}
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedTrip.company_name}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-bolman-purple font-black">
                    <MapPin size={14} />
                    {selectedTrip.from_city_name} ➔ {selectedTrip.to_city_name}
                  </span>
                  <span>•</span>
                  <span>{formatDateTime(selectedTrip.departure_time)}</span>
                  <span>•</span>
                  <span className="font-black text-bolman-purple">
                    {formatMoney(selectedTrip.final_price)} / تذكرة
                  </span>
                </div>
              </div>
            </div>

            <Button variant="secondary" className="px-3.5 py-2 text-xs" onClick={handleResetTrip}>
              {copy.changeTrip}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Seats Selection & Passenger Details (Visible when Trip is Selected) */}
      {selectedTrip ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Seat Map Card */}
          <Card className="xl:col-span-1">
            <CardTitle>{copy.seatSection}</CardTitle>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              انقر على المقاعد المتاحة لتحديدها للركاب.
            </p>
            <div className="mt-5 overflow-x-auto py-2">
              <SeatMap
                seats={seats}
                selected={selectedSeats}
                onToggle={(id) =>
                  setSelectedSeats((state) =>
                    state.includes(id) ? state.filter((item) => item !== id) : [...state, id],
                  )
                }
              />
            </div>
          </Card>

          {/* Passenger Information & Confirmation Card */}
          <Card className="xl:col-span-2 space-y-5">
            <CardTitle>{copy.passengerSection}</CardTitle>

            {isZeroPriceTrip ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                ⚠️ تنبيه: سعر هذه الرحلة محدد بـ 0 ل.س. يرجى مراجعة وتعديل سعر الرحلة ليكون أكبر من
                الصفر قبل إجراء الحجز.
              </div>
            ) : null}

            {/* Booking Options: Ticket Mode & Registered Booker Picker */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={messages.ticketMode.label}>
                <Select
                  value={ticketMode}
                  onChange={(e) => setTicketMode(e.target.value as 'group' | 'individual')}
                >
                  <option value="group">{messages.ticketMode.qrGroup}</option>
                  <option value="individual">{messages.ticketMode.qrIndividual}</option>
                </Select>
              </Field>

              <Field label={copy.passengerCount}>
                <Input
                  type="number"
                  readOnly
                  value={selectedSeats.length || 0}
                  className="bg-slate-50 dark:bg-bolman-surfaceDark font-bold"
                />
              </Field>
            </div>

            {/* Optional Registered Booker / Passenger search */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark/50">
              <PassengerBookerPicker
                selected={selectedBooker}
                onSelect={(passenger) => setSelectedBooker(passenger)}
                showBalance={false}
              />
            </div>

            {/* Passengers Inputs Form */}
            {selectedSeats.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-bolman-purple uppercase tracking-wider">
                  {copy.passengerSection} ({selectedSeats.length})
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {passengers.map((passenger, index) => (
                    <div
                      className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-bolman-borderDark dark:bg-bolman-surfaceDark"
                      key={index}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-bolman-purple">
                          {copy.passengerName} #{index + 1}
                        </span>
                        <span className="rounded-md bg-bolman-purple/10 px-2 py-0.5 text-[11px] font-bold text-bolman-purple">
                          مقعد #{selectedSeats[index] ? index + 1 : '-'}
                        </span>
                      </div>

                      <Field label={`${copy.passengerName}`}>
                        <Input
                          value={passenger.full_name}
                          onChange={(e) =>
                            setPassengers(
                              passengers.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, full_name: sanitizeName(e.target.value) }
                                  : item,
                              ),
                            )
                          }
                          placeholder="الاسم الثلاثي (نص فقط)"
                        />
                      </Field>

                      <div className="grid grid-cols-2 gap-2">
                        <Field label={messages.common.phone}>
                          <Input
                            inputMode="numeric"
                            value={passenger.phone}
                            onChange={(e) =>
                              setPassengers(
                                passengers.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, phone: sanitizePositiveDigits(e.target.value) }
                                    : item,
                                ),
                              )
                            }
                            placeholder="اختياري"
                          />
                        </Field>

                        <Field label={copy.nationalId}>
                          <Input
                            inputMode="numeric"
                            value={passenger.national_id}
                            onChange={(e) =>
                              setPassengers(
                                passengers.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        national_id: sanitizePositiveDigits(e.target.value),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="أرقام فقط"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-bolman-borderDark dark:text-slate-400">
                <Armchair size={24} className="mx-auto mb-2 text-slate-400" />
                <p className="font-bold">{copy.submitHint}</p>
              </div>
            )}

            {/* Price Summary & Confirmation Button */}
            {selectedSeats.length > 0 ? (
              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-bolman-surfaceDark">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{copy.totalAmount}</p>
                    <p className="text-xl font-black text-bolman-purple">
                      {formatMoney(totalBookingPrice)}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 text-end">
                    <span>
                      {selectedSeats.length} × {formatMoney(selectedTrip.final_price)}
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full"
                  disabled={!canSubmit || confirm.isPending}
                  onClick={() => {
                    setError(null);
                    confirm.mutate({
                      booker_user_id: selectedBooker?.user_id ?? null,
                      trip_id: selectedTrip.trip_id,
                      from_trip_stop_id: selectedTrip.from_trip_stop_id,
                      to_trip_stop_id: selectedTrip.to_trip_stop_id,
                      bus_seat_ids: selectedSeats,
                      passengers: passengers.map((p) => ({
                        full_name: p.full_name.trim(),
                        phone: p.phone?.trim() || undefined,
                        national_id: p.national_id.trim(),
                      })),
                      ticket_mode: ticketMode,
                    });
                  }}
                >
                  {confirm.isPending ? messages.common.loading : copy.confirm}
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
