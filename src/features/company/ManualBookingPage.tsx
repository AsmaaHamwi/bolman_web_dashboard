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
  ArrowLeftRight,
  UserCheck,
  CreditCard,
  Banknote,
  Smartphone,
  Zap,
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
import {
  useManualBookingStore,
  type ManualBookingPaymentMethod,
} from '../../stores/useManualBookingStore';
import {
  confirmOfficeCashBooking,
  confirmOfficeWalletBooking,
} from '../../services/booking.service';
import { findNextAvailableTripDate } from '../../services/trip.service';
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
  isValidSyrianPhone,
  isValidSyrianNationalId,
  getSyrianPhoneError,
  getSyrianNationalIdError,
  sanitizeName,
  sanitizePositiveDigits,
} from '../../utils/validation';

export function ManualBookingPage() {
  const { data: companyId } = useCompanyContext();
  const { messages, isArabic } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cities = [] } = useCities();

  // Persistent search & draft booking state
  const {
    originCityId,
    destinationCityId,
    travelDate,
    sortMode,
    selectedTrip,
    ticketMode,
    selectedSeats,
    paymentMethod,
    isBookerTraveling,
    selectedBooker,
    passengers,
    setOriginCityId,
    setDestinationCityId,
    setTravelDate,
    setSortMode,
    setSelectedTrip,
    setTicketMode,
    setSelectedSeats,
    setPaymentMethod,
    setIsBookerTraveling,
    setSelectedBooker,
    setPassengers,
    updatePassenger,
    swapCities: handleSwapCities,
    resetTrip: handleResetTrip,
    resetAll,
  } = useManualBookingStore();

  const [error, setError] = useState<string | null>(null);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbySearchNotice, setNearbySearchNotice] = useState<string | null>(null);

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
  const sortedTrips = useMemo<TripSearchRow[]>(() => {
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

  const { data: seats = [], isPending: isSeatsLoading } = useSeatStatus(seatParams);

  const totalBookingPrice = (selectedTrip?.final_price ?? 0) * selectedSeats.length;

  const isWalletInsufficient =
    paymentMethod === 'wallet' &&
    !!selectedBooker &&
    Number(selectedBooker.balance ?? 0) < totalBookingPrice;

  // Sync passengers count with selected seats and auto-fill booker if available and traveling
  useEffect(() => {
    const n = selectedSeats.length;
    if (n <= 0) {
      if (paymentMethod === 'wallet' && selectedBooker && isBookerTraveling) {
        setPassengers([
          {
            full_name: selectedBooker.full_name,
            phone: selectedBooker.phone || '',
            national_id: '',
          },
        ]);
      } else {
        setPassengers([]);
      }
      return;
    }

    setPassengers((prev) => {
      const next = [...prev];
      while (next.length < n) {
        const idx = next.length;
        if (idx === 0 && paymentMethod === 'wallet' && selectedBooker && isBookerTraveling) {
          next.push({
            full_name: selectedBooker.full_name,
            phone: selectedBooker.phone || '',
            national_id: '',
          });
        } else {
          next.push({ full_name: '', phone: '', national_id: '' });
        }
      }
      while (next.length > n) next.pop();

      // Ensure passenger 1 has booker name if booker is selected and traveling
      if (
        next.length > 0 &&
        paymentMethod === 'wallet' &&
        selectedBooker &&
        isBookerTraveling &&
        !next[0].full_name
      ) {
        next[0].full_name = selectedBooker.full_name;
        if (selectedBooker.phone && !next[0].phone) {
          next[0].phone = selectedBooker.phone;
        }
      }
      return next;
    });
  }, [selectedSeats.length, selectedBooker, isBookerTraveling, paymentMethod, setPassengers]);

  // Handler when selecting a registered booker
  const handleSelectBooker = (passenger: WalletPassengerSearchResult | null) => {
    setSelectedBooker(passenger);
    if (passenger && isBookerTraveling) {
      // If no seat selected yet, auto-select the first available seat
      if (selectedSeats.length === 0 && seats.length > 0) {
        const firstAvailable = seats.find((s) => s.status === 'available');
        if (firstAvailable) {
          const seatId =
            firstAvailable.bus_seat_id ||
            (firstAvailable as any).id ||
            String(firstAvailable.seat_number);
          setSelectedSeats([seatId]);
        }
      }
    }
  };

  const confirm = useMutation({
    mutationFn: async (payload: {
      booker_user_id: string | null;
      trip_id: string;
      from_trip_stop_id: string;
      to_trip_stop_id: string;
      bus_seat_ids: string[];
      passengers: Array<{ full_name: string; phone?: string; national_id: string }>;
      ticket_mode: 'group' | 'individual';
      payment_method: ManualBookingPaymentMethod;
    }) => {
      if (payload.payment_method === 'wallet') {
        if (!payload.booker_user_id) {
          throw new Error('يرجى تحديد صاحب المحفظة لإتمام الدفع من الرصيد.');
        }
        return confirmOfficeWalletBooking({
          booker_user_id: payload.booker_user_id,
          trip_id: payload.trip_id,
          from_trip_stop_id: payload.from_trip_stop_id,
          to_trip_stop_id: payload.to_trip_stop_id,
          bus_seat_ids: payload.bus_seat_ids,
          passengers: payload.passengers,
          ticket_mode: payload.ticket_mode,
        });
      } else {
        return confirmOfficeCashBooking({
          booker_user_id: payload.booker_user_id,
          trip_id: payload.trip_id,
          from_trip_stop_id: payload.from_trip_stop_id,
          to_trip_stop_id: payload.to_trip_stop_id,
          bus_seat_ids: payload.bus_seat_ids,
          passengers: payload.passengers,
          ticket_mode: payload.ticket_mode,
        });
      }
    },
    onSuccess: async (bookingId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['seat-status'] }),
        queryClient.invalidateQueries({ queryKey: ['trip-booking-count', selectedTrip?.trip_id] }),
        queryClient.invalidateQueries({ queryKey: ['trip-search'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      ]);
      resetAll(); // Clear draft after successful booking
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

  // Check for duplicate national IDs
  const nationalIds = passengers.map((p) => p.national_id.trim()).filter(Boolean);
  const hasDuplicateNationalIds = new Set(nationalIds).size !== nationalIds.length;

  // Check for duplicate phones (if filled)
  const phones = passengers.map((p) => p.phone?.trim()).filter(Boolean);
  const hasDuplicatePhones = new Set(phones).size !== phones.length;

  const canSubmit =
    !!selectedTrip &&
    !isZeroPriceTrip &&
    selectedSeats.length > 0 &&
    passengers.length === selectedSeats.length &&
    !hasDuplicateNationalIds &&
    !hasDuplicatePhones &&
    passengers.every(
      (p) =>
        isValidName(p.full_name) &&
        isValidSyrianNationalId(p.national_id) &&
        isValidSyrianPhone(p.phone, false),
    ) &&
    (paymentMethod !== 'wallet' || (!!selectedBooker && !isWalletInsufficient));

  const copy = messages.company.manualBooking;

  const handleOriginChange = (id: string) => {
    setOriginCityId(id);
    setNearbySearchNotice(null);
  };

  const handleDestinationChange = (id: string) => {
    setDestinationCityId(id);
    setNearbySearchNotice(null);
  };

  const handleTravelDateChange = (date: string) => {
    setTravelDate(date);
    setNearbySearchNotice(null);
  };

  const handleSearchNearby = async () => {
    if (!originCityId || !destinationCityId) return;
    setIsSearchingNearby(true);
    setNearbySearchNotice(null);
    setError(null);

    try {
      const result = await findNextAvailableTripDate({
        origin_city_id: originCityId,
        destination_city_id: destinationCityId,
        startDate: travelDate,
        daysAhead: 10,
        companyId,
      });

      if (result && result.trips.length > 0) {
        setTravelDate(result.date);
        setSelectedTrip(null);
        setSelectedSeats([]);
      } else {
        setNearbySearchNotice(
          'لم يتم العثور على أي رحلات متاحة لهذا المسار خلال الـ 10 أيام القادمة.',
        );
      }
    } catch {
      setNearbySearchNotice('حدث خطأ أثناء البحث عن المواعيد القريبة.');
    } finally {
      setIsSearchingNearby(false);
    }
  };

  const handleSelectTrip = (trip: TripSearchRow) => {
    setSelectedTrip(trip);
    setSelectedSeats([]);
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-start">
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          ⚠️ {error}
        </div>
      ) : null}

      {/* Selected Trip Details Banner - Placed right under title */}
      {selectedTrip ? (
        <div className="rounded-3xl border border-bolman-purple/30 bg-gradient-to-r from-bolman-purple/10 via-bolman-purple/5 to-transparent p-4 dark:border-bolman-purple/40 dark:from-bolman-purple/20 flex flex-wrap items-center justify-between gap-4 mt-2 mb-4">
          <div className="text-start">
            <div className="flex items-center gap-2">
              <span className="rounded bg-bolman-purple px-2 py-0.5 text-[10px] font-black text-white">
                الرحلة المحددة
              </span>
              <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300">
                {selectedTrip.company_name}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1 text-bolman-purple font-black">
                {selectedTrip.from_city_name} ➔ {selectedTrip.to_city_name}
              </span>
              <span>•</span>
              <span>{formatDateTime(selectedTrip.departure_time)}</span>
              <span>•</span>
              <span className="font-black text-bolman-purple">
                {formatMoney(selectedTrip.final_price)} / مقعد
              </span>
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 text-xs font-black rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-cardDark text-slate-700 dark:text-slate-300 transition"
            onClick={handleResetTrip}
          >
            إلغاء التحديد
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start mt-6">
        {/* Right Column: Search & Available Trips List (Sticky Sidebar on desktop) */}
        <div className="space-y-4 lg:sticky lg:top-[90px]">
          {/* Search Card */}
          <Card className="p-4 shadow-card border border-slate-200/80 dark:border-bolman-borderDark dark:bg-bolman-cardDark">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 dark:text-slate-500 text-start">
              خيارات البحث والوجهة
            </h3>
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
          </Card>

          {/* Available Trips Sidebar Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>الرحلات المتاحة</span>
                {searchParams && (
                  <span className="rounded-full bg-bolman-purple/10 px-2 py-0.5 text-[10px] font-bold text-bolman-purple">
                    {filteredTrips.length}
                  </span>
                )}
              </h3>

              {searchParams && filteredTrips.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSortMode(sortMode === 'soonest' ? 'cheapest' : 'soonest')}
                  className="text-[11px] font-bold text-bolman-purple hover:underline"
                >
                  {sortMode === 'soonest' ? 'ترتيب حسب السعر' : 'ترتيب حسب الوقت'}
                </button>
              )}
            </div>

            {/* Loading/Search States */}
            {!searchParams ? (
              <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 py-8 px-4 text-center dark:border-bolman-borderDark dark:bg-bolman-surfaceDark/30">
                <MapPin size={24} className="mx-auto text-bolman-purple/60 mb-2" />
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                  حدد مسار وتاريخ السفر لعرض الرحلات
                </p>
              </Card>
            ) : isSearchingTrips ? (
              <div className="space-y-2">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4 shadow-xs dark:border-bolman-borderDark dark:bg-bolman-cardDark h-28"
                  />
                ))}
              </div>
            ) : sortedTrips.length === 0 ? (
              <Card className="border border-slate-200/80 bg-white p-5 text-center shadow-card dark:border-bolman-borderDark dark:bg-bolman-cardDark space-y-2">
                <Bus size={24} className="mx-auto text-slate-400" />
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {copy.noTripsFound}
                </p>
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={isSearchingNearby}
                    onClick={handleSearchNearby}
                    className="w-full py-2 rounded-xl bg-bolman-purple text-white text-[11px] font-black hover:bg-bolman-deep transition disabled:opacity-60"
                  >
                    {isSearchingNearby ? 'جاري البحث القريب...' : 'بحث في موعد قريب'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSwapCities}
                    className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-black hover:bg-white dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200 transition"
                  >
                    عكس المسار
                  </button>
                </div>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[850px] overflow-y-auto pr-1">
                {sortedTrips.map((trip) => {
                  const availableSeats = Number(trip.available_seats_count ?? 0);
                  const isCheapest = trip.trip_id === bestPriceTripId;
                  const hasOffer = !!trip.offer_is && trip.title_offer;
                  return (
                    <div
                      key={trip.trip_id}
                      className={cx(
                        'group relative overflow-hidden rounded-2xl border bg-white p-3.5 shadow-xs transition-all hover:shadow-md cursor-pointer dark:bg-bolman-cardDark text-start',
                        selectedTrip?.trip_id === trip.trip_id
                          ? 'border-bolman-purple ring-2 ring-bolman-purple/20'
                          : isCheapest
                            ? 'border-emerald-500/40 hover:border-emerald-500'
                            : 'border-slate-200/80 hover:border-bolman-purple/40 dark:border-bolman-borderDark',
                      )}
                      onClick={() => handleSelectTrip(trip)}
                    >
                      {/* Badges row */}
                      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-100 dark:border-bolman-borderDark/60">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {trip.company_name}
                        </span>
                        <span
                          className={cx(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            availableSeats > 5
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : availableSeats > 0
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
                          )}
                        >
                          <Armchair size={10} />
                          <span>{availableSeats > 0 ? `${availableSeats} مقعد` : copy.fullyBooked}</span>
                        </span>
                      </div>

                      {/* Offer / Cheapest Badge if any */}
                      {(isCheapest || hasOffer) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {isCheapest && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                              <Sparkles size={9} />
                              <span>{copy.cheapestBadge}</span>
                            </span>
                          )}
                          {hasOffer && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400">
                              <span>🏷️</span>
                              <span>{trip.title_offer}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Route details */}
                      <div className="mt-2.5 flex items-center justify-between gap-2 text-start">
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {formatTime(trip.departure_time)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {trip.from_city_name}
                          </p>
                        </div>

                        {/* Route line */}
                        <div className="flex flex-1 flex-col items-center px-1">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                            {formatTripDuration(trip.departure_time, trip.arrival_time)}
                          </span>
                          <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-700 relative mt-0.5">
                            <span className="absolute top-1/2 -translate-y-1/2 left-0 text-slate-400">
                              {isArabic ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
                            </span>
                          </div>
                        </div>

                        <div className="text-end">
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {formatTime(trip.arrival_time)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {trip.to_city_name}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Price & Action */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-bolman-borderDark/60 flex items-center justify-between">
                        <div className="text-start">
                          {trip.offer_is && trip.base_price > trip.final_price && (
                            <span className="block text-[10px] font-semibold text-slate-400 line-through">
                              {formatMoney(trip.base_price)}
                            </span>
                          )}
                          <span className="text-xs font-black text-bolman-purple">
                            {formatMoney(trip.final_price)}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={availableSeats <= 0}
                          className={cx(
                            'px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border',
                            selectedTrip?.trip_id === trip.trip_id
                              ? 'bg-bolman-purple border-bolman-purple text-white shadow-xs'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-bolman-purple/40 hover:bg-white dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200',
                          )}
                        >
                          {selectedTrip?.trip_id === trip.trip_id ? 'محدد' : copy.selectTrip}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Interactive Seat Map & Booking details (takes 1fr space) */}
        <div className="space-y-6">
          {!selectedTrip ? (
            /* Main column empty placeholder */
            <Card className="border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center shadow-card dark:border-bolman-borderDark dark:bg-bolman-surfaceDark/10 min-h-[400px] flex flex-col justify-center items-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-bolman-purple/5 text-bolman-purple dark:bg-bolman-purple/10">
                <Bus size={32} />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">
                لوحة حجز المقاعد والمسافرين
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                الرجاء اختيار رحلة من القائمة الجانبية لتنشيط مخطط الباص وبدء تسجيل بيانات المسافرين وإصدار تذاكر الدفع.
              </p>
            </Card>
          ) : (
            /* Selected Trip Details, SeatMap, Passenger Forms */
            <>
              {/* 50% / 50% split for SeatMap & Passenger details */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {/* Seat Map Card (50% on Desktop) */}
                <Card className="p-4 sm:p-6 shadow-card border border-slate-200/80 dark:border-bolman-borderDark dark:bg-bolman-cardDark">
                  <div className="border-b border-slate-100 pb-3 dark:border-bolman-borderDark flex items-center justify-between text-start">
                    <div>
                      <CardTitle>{copy.seatSection}</CardTitle>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        انقر على المقاعد المتاحة لتحديدها للركاب.
                      </p>
                    </div>
                    {selectedSeats.length > 0 ? (
                      <span className="rounded-full bg-bolman-purple px-3 py-1 text-xs font-black text-white shadow-sm">
                        {selectedSeats.length} مقاعد محددة
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex justify-center overflow-x-auto py-2">
                    <SeatMap
                      seats={seats}
                      selected={selectedSeats}
                      loading={isSeatsLoading}
                      onToggle={(id) =>
                        setSelectedSeats((state) =>
                          state.includes(id) ? state.filter((item) => item !== id) : [...state, id],
                        )
                      }
                    />
                  </div>
                </Card>

                {/* Passenger Information & Confirmation Card (50% on Desktop) */}
                <Card className="space-y-5 p-4 sm:p-6 shadow-card border border-slate-200/80 dark:border-bolman-borderDark dark:bg-bolman-cardDark text-start">
                  <div className="border-b border-slate-100 pb-3 dark:border-bolman-borderDark">
                    <CardTitle>{copy.passengerSection}</CardTitle>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      طريقة الدفع وبيانات المسافرين
                    </p>
                  </div>

                  {isZeroPriceTrip ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      ⚠️ تنبيه: سعر هذه الرحلة محدد بـ 0 ل.س. يرجى مراجعة وتعديل سعر الرحلة ليكون أكبر من
                      الصفر قبل إجراء الحجز.
                    </div>
                  ) : null}

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                      طريقة الدفع في المكتب
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'office_cash', label: 'كاش (نقداً)', icon: '💵' },
                        { id: 'wallet', label: 'محفظة بولمان', icon: '💳' },
                        { id: 'syriatel_cash', label: 'سيرياتيل كاش', icon: '📱' },
                        { id: 'mtn_cash', label: 'إم تي إن كاش', icon: '📱' },
                        { id: 'sham_cash', label: 'شام كاش', icon: '⚡' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as ManualBookingPaymentMethod)}
                          className={cx(
                            'flex items-center gap-2 rounded-2xl border p-2.5 text-xs font-extrabold transition-all shadow-sm',
                            paymentMethod === m.id
                              ? 'border-bolman-purple bg-bolman-purple text-white shadow-glow scale-[1.02]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-bolman-purple/40 hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200',
                          )}
                        >
                          <span className="text-base">{m.icon}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wallet Selection & Traveler Question (Only when paymentMethod === 'wallet') */}
                  {paymentMethod === 'wallet' ? (
                    <div className="space-y-3 rounded-2xl border border-bolman-purple/25 bg-bolman-purple/5 p-4 dark:border-bolman-purple/35 dark:bg-bolman-purple/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-bolman-purple flex items-center gap-1.5">
                          <CreditCard size={15} />
                          <span>الدفع عبر محفظة بولمان الرقمية</span>
                        </span>
                        {selectedBooker ? (
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            الرصيد:{' '}
                            <span className="text-bolman-purple font-black">
                              {formatMoney(selectedBooker.balance ?? 0)}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      <PassengerBookerPicker
                        selected={selectedBooker}
                        onSelect={handleSelectBooker}
                        showBalance={true}
                      />

                      {selectedBooker ? (
                        <div className="mt-3 pt-3 border-t border-bolman-purple/15 space-y-2">
                          <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>
                              ❓ هل صاحب المحفظة (
                              <span className="text-bolman-purple">{selectedBooker.full_name}</span>)
                              سيسافر في هذه الرحلة؟
                            </span>
                          </label>
                          <div className="flex flex-col sm:flex-row items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsBookerTraveling(true)}
                              className={cx(
                                'w-full sm:flex-1 rounded-xl py-2 px-3 text-xs font-black transition-all border text-center',
                                isBookerTraveling
                                  ? 'border-bolman-purple bg-bolman-purple text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-300',
                              )}
                            >
                              ✓ نعم، سيسافر (حجز مقعد #1 باسمه)
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsBookerTraveling(false)}
                              className={cx(
                                'w-full sm:flex-1 rounded-xl py-2 px-3 text-xs font-black transition-all border text-center',
                                !isBookerTraveling
                                  ? 'border-bolman-purple bg-bolman-purple text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-300',
                              )}
                            >
                              ✕ لا، الحجز لشخص آخر
                            </button>
                          </div>

                          {isWalletInsufficient ? (
                            <div className="mt-2 rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs font-bold text-red-600 dark:text-red-400">
                              ⚠️ رصيد المحفظة غير كافٍ لإتمام الحجز! المطلوب:{' '}
                              {formatMoney(totalBookingPrice)} | الرصيد المتاح:{' '}
                              {formatMoney(selectedBooker.balance ?? 0)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          * يرجى البحث عن الراكب واختياره لخصم قيمة الحجز من محفظته الرقمية.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* Booking Options: Ticket Mode & Seat Count */}
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

                  {/* Passengers Inputs Form */}
                  {selectedSeats.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-bolman-purple uppercase tracking-wider">
                          {copy.passengerSection} ({selectedSeats.length})
                        </h4>
                        {paymentMethod === 'wallet' && selectedBooker && isBookerTraveling ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <UserCheck size={13} />
                            <span>تم تعبئة الراكب #1 تلقائياً</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        {passengers.map((passenger, index) => {
                          const seatId = selectedSeats[index];
                          const matchedSeat = seats.find(
                            (s) =>
                              s.bus_seat_id === seatId ||
                              (s as any).id === seatId ||
                              String(s.seat_number) === seatId,
                          );
                          const displaySeatNumber = matchedSeat?.seat_number ?? index + 1;
                          const isBookerPassenger =
                            index === 0 &&
                            paymentMethod === 'wallet' &&
                            isBookerTraveling &&
                            !!selectedBooker;

                          const phoneError = getSyrianPhoneError(passenger.phone, false);
                          const nationalIdError = getSyrianNationalIdError(passenger.national_id);

                          const isNationalIdDuplicate =
                            passenger.national_id &&
                            passengers.some(
                              (p, idx) =>
                                idx !== index &&
                                p.national_id.trim() === passenger.national_id.trim(),
                            );

                          const isPhoneDuplicate =
                            passenger.phone &&
                            passengers.some(
                              (p, idx) =>
                                idx !== index &&
                                p.phone &&
                                p.phone.trim() === passenger.phone.trim(),
                            );

                          return (
                            <div
                              className={cx(
                                'space-y-3 rounded-2xl border p-4 shadow-sm transition-all',
                                isBookerPassenger
                                  ? 'border-bolman-purple/30 bg-bolman-purple/5 dark:border-bolman-purple/40 dark:bg-bolman-purple/10'
                                  : 'border-slate-200/80 bg-white dark:border-bolman-borderDark dark:bg-bolman-surfaceDark',
                              )}
                              key={index}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-bolman-purple">
                                    {copy.passengerName} #{index + 1}
                                  </span>
                                  {isBookerPassenger ? (
                                    <span className="rounded-md bg-bolman-purple/20 px-2 py-0.5 text-[10px] font-bold text-bolman-purple">
                                      صاحب المحفظة والمسافر
                                    </span>
                                  ) : null}
                                </div>
                                <span className="rounded-xl bg-bolman-purple px-2.5 py-0.5 text-xs font-black text-white shadow-sm">
                                  مقعد #{displaySeatNumber}
                                </span>
                              </div>

                              <Field label={copy.passengerName}>
                                <Input
                                  value={passenger.full_name}
                                  onChange={(e) =>
                                    updatePassenger(index, {
                                      full_name: sanitizeName(e.target.value),
                                    })
                                  }
                                  placeholder="الاسم الثلاثي (نص فقط)"
                                />
                                {passenger.full_name && !isValidName(passenger.full_name) ? (
                                  <p className="mt-1 text-[11px] font-bold text-red-500">
                                    يرجى إدخال اسم صحيح (حرفين على الأقل بدون أرقام)
                                  </p>
                                ) : null}
                              </Field>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Field label={`${messages.common.phone} (10 أرقام - يبدأ بـ 09)`}>
                                    <Input
                                      inputMode="numeric"
                                      maxLength={10}
                                      value={passenger.phone}
                                      onChange={(e) =>
                                        updatePassenger(index, {
                                          phone: sanitizePositiveDigits(e.target.value).slice(
                                            0,
                                            10,
                                          ),
                                        })
                                      }
                                      placeholder="09xxxxxxxx (اختياري)"
                                      className={
                                        phoneError || isPhoneDuplicate ? 'border-red-400 focus:border-red-500' : ''
                                      }
                                    />
                                  </Field>
                                  {phoneError ? (
                                    <p className="mt-1 text-[11px] font-bold text-red-500 flex items-center gap-1">
                                      <span>⚠️</span>
                                      <span>{phoneError}</span>
                                    </p>
                                  ) : isPhoneDuplicate ? (
                                    <p className="mt-1 text-[11px] font-bold text-red-500 flex items-center gap-1">
                                      <span>⚠️</span>
                                      <span>رقم الهاتف مكرر لمسافر آخر</span>
                                    </p>
                                  ) : null}
                                </div>

                                <div>
                                  <Field label={`${copy.nationalId} (11 رقماً)`}>
                                    <Input
                                      inputMode="numeric"
                                      maxLength={11}
                                      value={passenger.national_id}
                                      onChange={(e) =>
                                        updatePassenger(index, {
                                          national_id: sanitizePositiveDigits(
                                            e.target.value,
                                          ).slice(0, 11),
                                        })
                                      }
                                      placeholder="11 رقماً"
                                      className={
                                        (passenger.national_id && nationalIdError) || isNationalIdDuplicate
                                          ? 'border-red-400 focus:border-red-500'
                                          : ''
                                      }
                                    />
                                  </Field>
                                  {passenger.national_id && nationalIdError ? (
                                    <p className="mt-1 text-[11px] font-bold text-red-500 flex items-center gap-1">
                                      <span>⚠️</span>
                                      <span>{nationalIdError}</span>
                                    </p>
                                  ) : isNationalIdDuplicate ? (
                                    <p className="mt-1 text-[11px] font-bold text-red-500 flex items-center gap-1">
                                      <span>⚠️</span>
                                      <span>الرقم الوطني مكرر لمسافر آخر</span>
                                    </p>
                                  ) : (
                                    <span className="mt-1 block text-[10px] text-slate-400 font-bold">
                                      {passenger.national_id.length}/11 رقماً
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {hasDuplicateNationalIds ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 text-start mt-2">
                          ⚠️ يوجد رقم وطني مكرر بين المسافرين. يجب أن يكون الرقم الوطني فريداً لكل مسافر.
                        </div>
                      ) : null}

                      {hasDuplicatePhones ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 text-start mt-2">
                          ⚠️ يوجد رقم هاتف مكرر بين المسافرين. يجب أن يكون رقم الهاتف فريداً لكل مسافر في حال إدخاله.
                        </div>
                      ) : null}
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
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {copy.totalAmount}
                          </p>
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
                            payment_method: paymentMethod,
                            booker_user_id:
                              paymentMethod === 'wallet' ? selectedBooker?.user_id ?? null : null,
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
