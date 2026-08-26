import { Search } from 'lucide-react';

import { DateInput } from '../../components/ui/DateInput';
import { Input, Select } from '../../components/ui/Input';
import { CompactFilterControl, FilterPanel, compactFilterInputClass } from '../../components/ui/FilterPanel';
import { useI18n } from '../../hooks/useI18n';
import type { ScanLogsFilters } from '../../services/qr.service';

export type { ScanLogsFilters };

export const EMPTY_SCAN_LOGS_FILTERS: ScanLogsFilters = {
  search: '',
  companyId: '',
  scannedDateFrom: '',
  scannedDateTo: '',
};

export function scanLogsFiltersEqual(a: ScanLogsFilters, b: ScanLogsFilters) {
  return (
    (a.search ?? '') === (b.search ?? '')
    && (a.companyId ?? '') === (b.companyId ?? '')
    && (a.scannedDateFrom ?? '') === (b.scannedDateFrom ?? '')
    && (a.scannedDateTo ?? '') === (b.scannedDateTo ?? '')
  );
}

export function hasActiveScanLogsFilters(filters: ScanLogsFilters) {
  return Object.values(filters).some((value) => String(value ?? '').trim() !== '');
}

function countActiveFilters(filters: ScanLogsFilters) {
  return [filters.companyId, filters.scannedDateFrom, filters.scannedDateTo]
    .filter((value) => String(value ?? '').trim()).length;
}

type CompanyOption = { id: string; name: string };

type ScanLogsFilterBarProps = {
  filters: ScanLogsFilters;
  companies: CompanyOption[];
  onChange: (filters: ScanLogsFilters) => void;
  onReset: () => void;
  loading?: boolean;
};

/** How far back the scanned-date pickers may reach — scan logs are historical by nature. */
const SCAN_LOG_PAST_YEARS = 5;

export function ScanLogsFilterBar({ filters, companies, onChange, onReset, loading = false }: ScanLogsFilterBarProps) {
  const { messages } = useI18n();
  const copy = messages.system.scanLogs.filters;

  function update<K extends keyof ScanLogsFilters>(key: K, value: ScanLogsFilters[K]) {
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
      showReset={hasActiveScanLogsFilters(filters)}
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
      <CompactFilterControl label={copy.company}>
        <Select
          className={compactFilterInputClass}
          value={filters.companyId ?? ''}
          onChange={(event) => update('companyId', event.target.value)}
        >
          <option value="">{copy.all}</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </CompactFilterControl>

      <CompactFilterControl label={copy.scannedDateFrom} className="min-w-[13rem] max-w-[15rem]">
        <DateInput
          className={compactFilterInputClass}
          pastYears={SCAN_LOG_PAST_YEARS}
          value={filters.scannedDateFrom ?? ''}
          onChange={(value) => update('scannedDateFrom', value)}
        />
      </CompactFilterControl>

      <CompactFilterControl label={copy.scannedDateTo} className="min-w-[13rem] max-w-[15rem]">
        <DateInput
          className={compactFilterInputClass}
          pastYears={SCAN_LOG_PAST_YEARS}
          min={filters.scannedDateFrom || undefined}
          value={filters.scannedDateTo ?? ''}
          onChange={(value) => update('scannedDateTo', value)}
        />
      </CompactFilterControl>
    </FilterPanel>
  );
}
