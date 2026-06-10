import { Search } from 'lucide-react';

import { Input, Select } from '../../components/ui/Input';

import { CompactFilterControl, FilterPanel, compactFilterInputClass } from '../../components/ui/FilterPanel';

import { useI18n } from '../../hooks/useI18n';

import type { BookingsListFilters } from '../../services/booking.service';



export const EMPTY_BOOKINGS_FILTERS: BookingsListFilters = {

  search: '',

  bookingStatus: '',

  paymentStatus: '',

  paymentMethod: '',

  ticketMode: '',

  tripDateFrom: '',

  tripDateTo: '',

};



type BookingsFilterBarProps = {

  filters: BookingsListFilters;

  onChange: (filters: BookingsListFilters) => void;

  onReset: () => void;

  loading?: boolean;

};



const BOOKING_STATUS_OPTIONS = ['', 'pending', 'confirmed', 'boarded', 'partially_boarded', 'completed', 'cancelled'] as const;

const PAYMENT_STATUS_OPTIONS = ['', 'pending', 'success', 'failed', 'refunded'] as const;

const PAYMENT_METHOD_OPTIONS = ['', 'office_cash', 'wallet'] as const;

const TICKET_MODE_OPTIONS = ['', 'group', 'individual'] as const;



function countActiveFilters(filters: BookingsListFilters) {

  return [

    filters.bookingStatus,

    filters.paymentStatus,

    filters.paymentMethod,

    filters.ticketMode,

    filters.tripDateFrom,

    filters.tripDateTo,

  ].filter((value) => String(value ?? '').trim()).length;

}



export function BookingsFilterBar({ filters, onChange, onReset, loading = false }: BookingsFilterBarProps) {

  const { messages } = useI18n();

  const copy = messages.company.bookings.filters;



  function update<K extends keyof BookingsListFilters>(key: K, value: BookingsListFilters[K]) {

    onChange({ ...filters, [key]: value });

  }



  const activeCount = countActiveFilters(filters);



  return (

    <FilterPanel

      title={copy.title}

      clearLabel={copy.clear}

      showFiltersLabel={messages.common.showFilters}

      hideFiltersLabel={messages.common.hideFilters}

      loading={loading}

      showReset={activeCount > 0 || !!filters.search?.trim()}

      onReset={onReset}

      activeCount={activeCount}

      search={

        <div className="relative">

          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />

          <Input

            className={`${compactFilterInputClass} ps-9`}

            value={filters.search ?? ''}

            onChange={(event) => update('search', event.target.value)}

            placeholder={copy.searchPlaceholder}

            aria-label={copy.search}

          />

        </div>

      }

    >

      <CompactFilterControl label={copy.bookingStatus}>

        <Select

          className={compactFilterInputClass}

          value={filters.bookingStatus ?? ''}

          onChange={(event) => update('bookingStatus', event.target.value)}

        >

          <option value="">{copy.all}</option>

          {BOOKING_STATUS_OPTIONS.filter(Boolean).map((value) => (

            <option key={value} value={value}>

              {messages.status[value as keyof typeof messages.status] ?? value}

            </option>

          ))}

        </Select>

      </CompactFilterControl>



      <CompactFilterControl label={copy.paymentStatus}>

        <Select

          className={compactFilterInputClass}

          value={filters.paymentStatus ?? ''}

          onChange={(event) => update('paymentStatus', event.target.value)}

        >

          <option value="">{copy.all}</option>

          {PAYMENT_STATUS_OPTIONS.filter(Boolean).map((value) => (

            <option key={value} value={value}>

              {messages.status[value as keyof typeof messages.status] ?? value}

            </option>

          ))}

        </Select>

      </CompactFilterControl>



      <CompactFilterControl label={copy.paymentMethod}>

        <Select

          className={compactFilterInputClass}

          value={filters.paymentMethod ?? ''}

          onChange={(event) => update('paymentMethod', event.target.value)}

        >

          <option value="">{copy.all}</option>

          {PAYMENT_METHOD_OPTIONS.filter(Boolean).map((value) => (

            <option key={value} value={value}>

              {copy.paymentMethods[value as keyof typeof copy.paymentMethods] ?? value}

            </option>

          ))}

        </Select>

      </CompactFilterControl>



      <CompactFilterControl label={copy.ticketMode}>

        <Select

          className={compactFilterInputClass}

          value={filters.ticketMode ?? ''}

          onChange={(event) => update('ticketMode', event.target.value)}

        >

          <option value="">{copy.all}</option>

          {TICKET_MODE_OPTIONS.filter(Boolean).map((value) => (

            <option key={value} value={value}>

              {value === 'group' ? messages.ticketMode.qrGroup : messages.ticketMode.qrIndividual}

            </option>

          ))}

        </Select>

      </CompactFilterControl>



      <CompactFilterControl label={copy.tripDateFrom} className="min-w-[10rem] max-w-[11rem]">

        <Input

          type="date"

          className={compactFilterInputClass}

          value={filters.tripDateFrom ?? ''}

          onChange={(event) => update('tripDateFrom', event.target.value)}

        />

      </CompactFilterControl>



      <CompactFilterControl label={copy.tripDateTo} className="min-w-[10rem] max-w-[11rem]">

        <Input

          type="date"

          className={compactFilterInputClass}

          value={filters.tripDateTo ?? ''}

          min={filters.tripDateFrom || undefined}

          onChange={(event) => update('tripDateTo', event.target.value)}

        />

      </CompactFilterControl>

    </FilterPanel>

  );

}


