import { Search } from 'lucide-react';

import { CityPicker } from '../../components/ui/CityPicker';
import { Input, Select } from '../../components/ui/Input';
import { CompactFilterControl, FilterPanel, compactFilterInputClass } from '../../components/ui/FilterPanel';

import { useI18n } from '../../hooks/useI18n';

import type { TripsListFilters } from '../../services/trip.service';
import { getLocalDateInputValue } from '../../utils/format';

export type { TripsListFilters };

export const EMPTY_TRIPS_FILTERS: TripsListFilters = {
  search: '',
  status: '',
  originCityId: '',
  destinationCityId: '',
  departureDateFrom: '',
  departureDateTo: '',
  offerFilter: '',
};

export function getDefaultTripsFilters(): TripsListFilters {
  return {
    ...EMPTY_TRIPS_FILTERS,
    departureDateFrom: getLocalDateInputValue(),
  };
}

export function hasCustomTripsFilters(filters: TripsListFilters) {
  const defaultFrom = getLocalDateInputValue();
  return Object.entries(filters).some(([key, value]) => {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      return key === 'departureDateFrom';
    }
    if (key === 'departureDateFrom' && trimmed === defaultFrom && !filters.departureDateTo?.trim()) {
      return false;
    }
    return true;
  });
}



type CityOption = { id: string; name: string };



type TripsFilterBarProps = {

  filters: TripsListFilters;

  cities: CityOption[];

  onChange: (filters: TripsListFilters) => void;

  onReset: () => void;

  loading?: boolean;

};



const TRIP_STATUS_OPTIONS = ['', 'scheduled', 'active', 'completed', 'cancelled'] as const;

const OFFER_FILTER_OPTIONS = ['', 'yes', 'no'] as const;



function countActiveFilters(filters: TripsListFilters) {
  const defaultFrom = getLocalDateInputValue();
  return [
    filters.status,
    filters.originCityId,
    filters.destinationCityId,
    filters.departureDateFrom !== defaultFrom ? filters.departureDateFrom : '',
    filters.departureDateTo,
    filters.offerFilter,
  ].filter((value) => String(value ?? '').trim()).length;
}



function statusLabel(value: string, messages: ReturnType<typeof useI18n>['messages']) {

  if (value === 'active') return messages.status.active;

  return messages.status[value as keyof typeof messages.status] ?? value;

}



export function TripsFilterBar({ filters, cities, onChange, onReset, loading = false }: TripsFilterBarProps) {

  const { messages } = useI18n();

  const copy = messages.company.trips.filters;



  function update<K extends keyof TripsListFilters>(key: K, value: TripsListFilters[K]) {

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

      showReset={activeCount > 0 || !!filters.search?.trim() || hasCustomTripsFilters(filters)}

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

      <CompactFilterControl label={copy.status}>

        <Select

          className={compactFilterInputClass}

          value={filters.status ?? ''}

          onChange={(event) => update('status', event.target.value)}

        >

          <option value="">{copy.all}</option>

          {TRIP_STATUS_OPTIONS.filter(Boolean).map((value) => (

            <option key={value} value={value}>

              {statusLabel(value, messages)}

            </option>

          ))}

        </Select>

      </CompactFilterControl>



      <CompactFilterControl label={copy.originCity}>

        <CityPicker

          compact

          className={compactFilterInputClass}

          cities={cities}

          value={filters.originCityId ?? ''}

          onChange={(cityId) => update('originCityId', cityId)}

          placeholder={copy.all}

        />

      </CompactFilterControl>



      <CompactFilterControl label={copy.destinationCity}>

        <CityPicker

          compact

          className={compactFilterInputClass}

          cities={cities}

          value={filters.destinationCityId ?? ''}

          onChange={(cityId) => update('destinationCityId', cityId)}

          placeholder={copy.all}

        />

      </CompactFilterControl>



      <CompactFilterControl label={copy.offerFilter} className="min-w-[8rem] max-w-[10rem]">

        <Select

          className={compactFilterInputClass}

          value={filters.offerFilter ?? ''}

          onChange={(event) => update('offerFilter', event.target.value as TripsListFilters['offerFilter'])}

        >

          <option value="">{copy.all}</option>

          {OFFER_FILTER_OPTIONS.filter(Boolean).map((value) => (

            <option key={value} value={value}>

              {value === 'yes' ? copy.withOffer : copy.withoutOffer}

            </option>

          ))}

        </Select>

      </CompactFilterControl>



      <CompactFilterControl label={copy.departureDateFrom} className="min-w-[10rem] max-w-[11rem]">

        <Input

          type="date"

          className={compactFilterInputClass}

          value={filters.departureDateFrom ?? ''}

          onChange={(event) => update('departureDateFrom', event.target.value)}

        />

      </CompactFilterControl>



      <CompactFilterControl label={copy.departureDateTo} className="min-w-[10rem] max-w-[11rem]">

        <Input

          type="date"

          className={compactFilterInputClass}

          value={filters.departureDateTo ?? ''}

          min={filters.departureDateFrom || undefined}

          onChange={(event) => update('departureDateTo', event.target.value)}

        />

      </CompactFilterControl>

    </FilterPanel>

  );

}


