import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TripSearchRow } from '../types/domain';
import type { WalletPassengerSearchResult } from '../services/wallet.service';
import { getLocalDateInputValue } from '../utils/format';

export type ManualBookingPaymentMethod =
  | 'office_cash'
  | 'wallet'
  | 'syriatel_cash'
  | 'mtn_cash'
  | 'sham_cash';

export interface PassengerFormItem {
  full_name: string;
  phone: string;
  national_id: string;
}

interface ManualBookingStore {
  // Search parameters
  originCityId: string;
  destinationCityId: string;
  travelDate: string;
  sortMode: 'soonest' | 'cheapest';

  // Selected Trip & Booking State
  selectedTrip: TripSearchRow | null;
  ticketMode: 'group' | 'individual';
  selectedSeats: string[];
  paymentMethod: ManualBookingPaymentMethod;
  isBookerTraveling: boolean;
  selectedBooker: WalletPassengerSearchResult | null;
  passengers: PassengerFormItem[];

  // Actions
  setOriginCityId: (id: string) => void;
  setDestinationCityId: (id: string) => void;
  setTravelDate: (date: string) => void;
  setSortMode: (mode: 'soonest' | 'cheapest') => void;
  setSelectedTrip: (trip: TripSearchRow | null) => void;
  setTicketMode: (mode: 'group' | 'individual') => void;
  setSelectedSeats: (seats: string[] | ((prev: string[]) => string[])) => void;
  setPaymentMethod: (method: ManualBookingPaymentMethod) => void;
  setIsBookerTraveling: (traveling: boolean) => void;
  setSelectedBooker: (booker: WalletPassengerSearchResult | null) => void;
  setPassengers: (passengers: PassengerFormItem[] | ((prev: PassengerFormItem[]) => PassengerFormItem[])) => void;
  updatePassenger: (index: number, patch: Partial<PassengerFormItem>) => void;
  swapCities: () => void;
  resetTrip: () => void;
  resetAll: () => void;
}

export const useManualBookingStore = create<ManualBookingStore>()(
  persist(
    (set, get) => ({
      originCityId: '',
      destinationCityId: '',
      travelDate: getLocalDateInputValue(),
      sortMode: 'soonest',
      selectedTrip: null,
      ticketMode: 'group',
      selectedSeats: [],
      paymentMethod: 'office_cash',
      isBookerTraveling: true,
      selectedBooker: null,
      passengers: [],

      setOriginCityId: (id) =>
        set({
          originCityId: id,
          selectedTrip: null,
          selectedSeats: [],
        }),

      setDestinationCityId: (id) =>
        set({
          destinationCityId: id,
          selectedTrip: null,
          selectedSeats: [],
        }),

      setTravelDate: (date) =>
        set({
          travelDate: date,
          selectedTrip: null,
          selectedSeats: [],
        }),

      setSortMode: (mode) => set({ sortMode: mode }),

      setSelectedTrip: (trip) =>
        set({
          selectedTrip: trip,
          selectedSeats: [],
        }),

      setTicketMode: (mode) => set({ ticketMode: mode }),

      setSelectedSeats: (updater) => {
        const next = typeof updater === 'function' ? updater(get().selectedSeats) : updater;
        set({ selectedSeats: next });
      },

      setPaymentMethod: (method) =>
        set((state) => {
          if (method !== 'wallet') {
            return {
              paymentMethod: method,
              selectedBooker: null,
            };
          }
          return { paymentMethod: method };
        }),

      setIsBookerTraveling: (traveling) =>
        set((state) => {
          const currentPassengers = [...state.passengers];
          if (state.selectedBooker) {
            if (traveling) {
              if (currentPassengers.length === 0) {
                currentPassengers.push({
                  full_name: state.selectedBooker.full_name,
                  phone: state.selectedBooker.phone || '',
                  national_id: '',
                });
              } else {
                currentPassengers[0] = {
                  ...currentPassengers[0],
                  full_name: state.selectedBooker.full_name,
                  phone: state.selectedBooker.phone || currentPassengers[0].phone || '',
                };
              }
            } else {
              // If not traveling and passenger #1 was booker, clear it so dispatcher enters actual traveler
              if (currentPassengers.length > 0 && currentPassengers[0].full_name === state.selectedBooker.full_name) {
                currentPassengers[0] = { full_name: '', phone: '', national_id: '' };
              }
            }
          }
          return {
            isBookerTraveling: traveling,
            passengers: currentPassengers,
          };
        }),

      setSelectedBooker: (booker) => {
        set((state) => {
          if (!booker) {
            return { selectedBooker: null };
          }

          const currentPassengers = [...state.passengers];
          if (state.isBookerTraveling) {
            if (currentPassengers.length === 0) {
              currentPassengers.push({
                full_name: booker.full_name,
                phone: booker.phone || '',
                national_id: '',
              });
            } else {
              currentPassengers[0] = {
                ...currentPassengers[0],
                full_name: booker.full_name,
                phone: booker.phone || currentPassengers[0].phone || '',
              };
            }
          }

          return {
            selectedBooker: booker,
            passengers: currentPassengers,
          };
        });
      },

      setPassengers: (updater) => {
        const next = typeof updater === 'function' ? updater(get().passengers) : updater;
        set({ passengers: next });
      },

      updatePassenger: (index, patch) => {
        set((state) => {
          const next = [...state.passengers];
          if (next[index]) {
            next[index] = { ...next[index], ...patch };
          }
          return { passengers: next };
        });
      },

      swapCities: () => {
        set((state) => ({
          originCityId: state.destinationCityId,
          destinationCityId: state.originCityId,
          selectedTrip: null,
          selectedSeats: [],
        }));
      },

      resetTrip: () =>
        set({
          selectedTrip: null,
          selectedSeats: [],
        }),

      resetAll: () =>
        set({
          originCityId: '',
          destinationCityId: '',
          travelDate: getLocalDateInputValue(),
          selectedTrip: null,
          ticketMode: 'group',
          selectedSeats: [],
          paymentMethod: 'office_cash',
          isBookerTraveling: true,
          selectedBooker: null,
          passengers: [],
        }),
    }),
    {
      name: 'bolman-manual-booking-draft',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
