import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { TripRouteSearchForm } from '../../components/booking/TripRouteSearchForm';
import { PassengerBookerPicker } from '../../components/booking/PassengerBookerPicker';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SeatMap } from '../../components/booking/SeatMap';
import { useI18n } from '../../hooks/useI18n';
import { useCities } from '../../hooks/useCities';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { useSearchTrips } from '../../hooks/useTrips';
import { useSeatStatus } from '../../hooks/useSeats';
import { confirmOfficeCashBooking, confirmOfficeWalletBooking } from '../../services/booking.service';
import { formatDateTime, formatMoney, getLocalDateInputValue } from '../../utils/format';
import type { TripSearchRow } from '../../types/domain';
import type { WalletPassengerSearchResult } from '../../services/wallet.service';

type OfficePaymentMethod = 'office_cash' | 'wallet';

function getSearchResultKey(row: TripSearchRow) {
  return `${row.trip_id}:${row.from_trip_stop_id}:${row.to_trip_stop_id}`;
}

function getSearchResultLabel(row: TripSearchRow) {
  const parts = [formatDateTime(row.departure_time)];
  if (row.from_city_name && row.to_city_name) {
    parts.push(`${row.from_city_name} → ${row.to_city_name}`);
  }
  if (row.final_price != null) parts.push(formatMoney(row.final_price));
  return parts.join(' · ');
}

export function ManualBookingPage() {
  const { data: companyId } = useCompanyContext();
  const { messages } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParamsUrl, setSearchParamsUrl] = useSearchParams();
  const prefillTripId = searchParamsUrl.get('trip_id') ?? '';
  const prefillOrigin = searchParamsUrl.get('origin_city_id') ?? '';
  const prefillDestination = searchParamsUrl.get('destination_city_id') ?? '';
  const prefillTravelDate = searchParamsUrl.get('travel_date') ?? '';
  const { data: cities = [] } = useCities();
  const [travelDate, setTravelDate] = useState(() => prefillTravelDate || getLocalDateInputValue());
  const [originCityId, setOriginCityId] = useState(prefillOrigin);
  const [destinationCityId, setDestinationCityId] = useState(prefillDestination);
  const searchReady = Boolean(originCityId && destinationCityId && travelDate);
  const searchParams = searchReady
    ? { origin_city_id: originCityId, destination_city_id: destinationCityId, travel_date: travelDate }
    : undefined;
  const { data: searchResults = [], isFetching: tripsLoading } = useSearchTrips(searchParams);
  const bookableTrips = useMemo(
    () => searchResults.filter((row) => !companyId || row.company_id === companyId),
    [searchResults, companyId],
  );
  const [selectedSearchKey, setSelectedSearchKey] = useState('');
  const selectedSearchResult = useMemo(
    () => bookableTrips.find((row) => getSearchResultKey(row) === selectedSearchKey) ?? null,
    [bookableTrips, selectedSearchKey],
  );
  const tripId = selectedSearchResult?.trip_id ?? '';
  const from = selectedSearchResult?.from_trip_stop_id ?? '';
  const to = selectedSearchResult?.to_trip_stop_id ?? '';
  const [ticketMode, setTicketMode] = useState<'group' | 'individual'>('group');
  const [paymentMethod, setPaymentMethod] = useState<OfficePaymentMethod>('office_cash');
  const [booker, setBooker] = useState<WalletPassengerSearchResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Array<{ full_name: string; phone: string; national_id: string }>>([]);
  const { data: seats = [] } = useSeatStatus(tripId && from && to ? { tripId, fromTripStopId: from, toTripStopId: to } : undefined);
  const [error, setError] = useState<string | null>(null);

  const unitPrice = selectedSearchResult?.final_price ?? 0;
  const bookingTotal = unitPrice * selected.length;
  const walletBalance = booker?.balance ?? 0;
  const walletInsufficient = paymentMethod === 'wallet' && !!booker && bookingTotal > walletBalance;

  useEffect(() => {
    setSelected([]);
  }, [from, to]);

  useEffect(() => {
    if (!prefillTripId) return;
    if (selectedSearchKey) return;
    const match = bookableTrips.find((row) => row.trip_id === prefillTripId);
    if (match) {
      setSelectedSearchKey(getSearchResultKey(match));
      setSearchParamsUrl({}, { replace: true });
    }
  }, [prefillTripId, bookableTrips, selectedSearchKey, setSearchParamsUrl]);

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

  useEffect(() => {
    if (!booker || passengers.length === 0) return;
    setPassengers((prev) => {
      const next = [...prev];
      const first = next[0];
      if (!first) return prev;
      next[0] = {
        full_name: first.full_name.trim() ? first.full_name : (booker.full_name ?? ''),
        phone: first.phone.trim() ? first.phone : (booker.phone ?? ''),
        national_id: first.national_id,
      };
      return next;
    });
  }, [booker]);

  const confirmCash = useMutation({
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

  const confirmWallet = useMutation({
    mutationFn: confirmOfficeWalletBooking,
    onSuccess: async (bookingId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['seat-status'] }),
        queryClient.invalidateQueries({ queryKey: ['trip-booking-count', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      ]);
      setError(null);
      navigate(`/company/bookings/${bookingId}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : messages.common.unexpectedError);
    },
  });

  const passengersValid =
    passengers.length === selected.length &&
    passengers.every((p) => p.full_name.trim() && p.national_id.trim());

  const canSubmit =
    tripId &&
    from &&
    to &&
    selected.length > 0 &&
    passengersValid &&
    (paymentMethod === 'office_cash' || !!booker) &&
    !walletInsufficient;

  const tripCopy = messages.company.manualBooking;
  const isPending = confirmCash.isPending || confirmWallet.isPending;

  function resetTripSelection() {
    setSelectedSearchKey('');
    setSelected([]);
  }

  function resetSearch() {
    resetTripSelection();
  }

  function buildPassengerPayload() {
    return passengers.map((p, index) => ({
      full_name: p.full_name.trim(),
      phone: p.phone?.trim() || undefined,
      national_id: p.national_id.trim(),
      user_id: index === 0 && booker ? booker.user_id : undefined,
    }));
  }

  function handleConfirm() {
    setError(null);
    const payload = {
      trip_id: tripId,
      from_trip_stop_id: from,
      to_trip_stop_id: to,
      bus_seat_ids: selected,
      passengers: buildPassengerPayload(),
      ticket_mode: ticketMode,
    };

    if (paymentMethod === 'wallet') {
      if (!booker) return;
      confirmWallet.mutate({
        ...payload,
        booker_user_id: booker.user_id,
      });
      return;
    }

    confirmCash.mutate({
      ...payload,
      booker_user_id: booker?.user_id ?? null,
    });
  }

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
          <CardTitle>{tripCopy.tripSection}</CardTitle>
          <div className="mt-4 space-y-4">
            <TripRouteSearchForm
              cities={cities}
              originCityId={originCityId}
              destinationCityId={destinationCityId}
              travelDate={travelDate}
              onOriginChange={(cityId) => {
                setOriginCityId(cityId);
                resetSearch();
              }}
              onDestinationChange={(cityId) => {
                setDestinationCityId(cityId);
                resetSearch();
              }}
              onTravelDateChange={(date) => {
                setTravelDate(date);
                resetSearch();
              }}
              onSwap={() => {
                setOriginCityId(destinationCityId);
                setDestinationCityId(originCityId);
                resetSearch();
              }}
            />
            {!searchReady ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{tripCopy.searchHint}</p>
            ) : originCityId === destinationCityId ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">{tripCopy.sameCityError}</p>
            ) : tripsLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{messages.common.loading}</p>
            ) : bookableTrips.length === 0 ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">{tripCopy.noTripsForSearch}</p>
            ) : null}
            <Field label={tripCopy.trip}>
              <Select
                value={selectedSearchKey}
                disabled={!searchReady || originCityId === destinationCityId || bookableTrips.length === 0}
                onChange={(e) => {
                  setSelectedSearchKey(e.target.value);
                  setSelected([]);
                }}
              >
                <option value="">{messages.common.choose}</option>
                {bookableTrips.map((row) => (
                  <option key={getSearchResultKey(row)} value={getSearchResultKey(row)}>
                    {getSearchResultLabel(row)}
                  </option>
                ))}
              </Select>
            </Field>
            {selectedSearchResult ? (
              <div className="rounded-2xl border border-bolman-purple/15 bg-bolman-purple/5 px-4 py-3 dark:border-bolman-purple/25 dark:bg-bolman-purple/10">
                <p className="text-xs font-extrabold text-bolman-purple">{tripCopy.yourSegment}</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                  {selectedSearchResult.from_city_name}
                  <span className="mx-2 text-bolman-purple">→</span>
                  {selectedSearchResult.to_city_name}
                </p>
              </div>
            ) : null}
            <Field label={messages.ticketMode.label}>
              <Select value={ticketMode} onChange={(e) => setTicketMode(e.target.value as 'group' | 'individual')}>
                <option value="group">{messages.ticketMode.qrGroup}</option>
                <option value="individual">{messages.ticketMode.qrIndividual}</option>
              </Select>
            </Field>
            <Field label={messages.company.manualBooking.passengerCount}>
              <Input type="number" readOnly value={selected.length || 0} className="bg-slate-50 dark:bg-bolman-surfaceDark" />
            </Field>
            {selected.length > 0 && unitPrice > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-bolman-borderDark dark:bg-bolman-surfaceDark">
                <span className="font-extrabold text-slate-700 dark:text-slate-200">{tripCopy.bookingTotal}: </span>
                <span className="font-extrabold text-bolman-purple">{formatMoney(bookingTotal)}</span>
              </div>
            ) : null}
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle>{messages.company.manualBooking.seatSection}</CardTitle>
          <div className="mt-4">
            <SeatMap seats={seats} selected={selected} onToggle={(id) => setSelected((state) => state.includes(id) ? state.filter((item) => item !== id) : [...state, id])} />
          </div>
        </Card>
        <Card className="xl:col-span-3">
          <CardTitle>{tripCopy.paymentSection}</CardTitle>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label={tripCopy.paymentMethod}>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as OfficePaymentMethod)}
                >
                  <option value="office_cash">{tripCopy.paymentOfficeCash}</option>
                  <option value="wallet">{tripCopy.paymentWallet}</option>
                </Select>
              </Field>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {paymentMethod === 'wallet' ? tripCopy.walletPaymentHint : tripCopy.cashPaymentHint}
              </p>
              {walletInsufficient ? (
                <p className="text-sm text-red-600 dark:text-red-300">{tripCopy.insufficientWalletBalance}</p>
              ) : null}
            </div>
            <div>
              <CardTitle className="text-base">{tripCopy.bookerSection}</CardTitle>
              <div className="mt-3">
                <PassengerBookerPicker
                  selected={booker}
                  onSelect={setBooker}
                  required={paymentMethod === 'wallet'}
                  showBalance={paymentMethod === 'wallet'}
                />
              </div>
            </div>
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
            disabled={!canSubmit || isPending}
            onClick={handleConfirm}
          >
            {isPending ? messages.common.loading : messages.company.manualBooking.confirm}
          </Button>
        </Card>
      </div>
    </div>
  );
}
