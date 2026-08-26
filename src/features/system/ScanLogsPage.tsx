import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/Status';
import { useI18n } from '../../hooks/useI18n';
import { liveDashboardQueryOptions } from '../../lib/queryClient';
import { listCompanies } from '../../services/company.service';
import { SCAN_LOGS_PAGE_SIZE, listScanLogs, type ScanLogsFilters } from '../../services/qr.service';
import { formatDateTime } from '../../utils/format';
import {
  EMPTY_SCAN_LOGS_FILTERS,
  ScanLogsFilterBar,
  hasActiveScanLogsFilters,
  scanLogsFiltersEqual,
} from './ScanLogsFilterBar';

export function ScanLogsPage() {
  const { messages } = useI18n();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ScanLogsFilters>(EMPTY_SCAN_LOGS_FILTERS);
  const [queryFilters, setQueryFilters] = useState<ScanLogsFilters>(EMPTY_SCAN_LOGS_FILTERS);

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: listCompanies });
  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['scan-logs', page, queryFilters],
    queryFn: () => listScanLogs(null, { page, pageSize: SCAN_LOGS_PAGE_SIZE, filters: queryFilters }),
    ...liveDashboardQueryOptions,
  });

  const logs = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const pageSize = data?.pageSize ?? SCAN_LOGS_PAGE_SIZE;
  const filtersPending = !scanLogsFiltersEqual(filters, queryFilters);
  const tableLoading = isPending || isFetching || filtersPending;

  useEffect(() => {
    const timer = window.setTimeout(() => setQueryFilters(filters), filters.search?.trim() ? 400 : 0);
    return () => window.clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [queryFilters]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const companyOptions = useMemo(
    () => companies.map((company: any) => ({ id: company.id, name: company.name })),
    [companies],
  );

  const emptyMessage = hasActiveScanLogsFilters(queryFilters)
    ? messages.system.scanLogs.filters.noResults
    : messages.system.scanLogs.emptyHint;

  return (
    <div>
      <PageHeader title={messages.system.scanLogs.title} subtitle={messages.system.scanLogs.subtitle} />

      <ScanLogsFilterBar
        filters={filters}
        companies={companyOptions}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_SCAN_LOGS_FILTERS)}
        loading={tableLoading}
      />

      {total > 0 ? (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {messages.system.scanLogs.showingRange
            .replace('{from}', String(rangeFrom))
            .replace('{to}', String(rangeTo))
            .replace('{total}', String(total))}
        </p>
      ) : null}

      <DataTable
        columns={messages.system.scanLogs.table as unknown as string[]}
        loading={tableLoading}
        loadingRows={8}
        empty={false}
        error={isError ? error : undefined}
        onRetry={() => refetch()}
      >
        {logs.map((log: any) => (
          <tr key={log.id}>
            <Td>{formatDateTime(log.scanned_at)}</Td>
            <Td>{log.ticket?.ticket_code ?? '-'}</Td>
            <Td>{log.trip ? `${log.trip.origin?.name} ← ${log.trip.destination?.name}` : '-'}</Td>
            <Td>{log.driver?.user?.full_name ?? '-'}</Td>
            <Td><StatusBadge value={log.scan_result} /></Td>
          </tr>
        ))}
      </DataTable>

      {!tableLoading && !isError && !logs.length ? (
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-bolman-borderDark dark:bg-bolman-cardDark">
          <p className="text-base font-medium text-slate-800 dark:text-white">{messages.common.noData}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          disabled={tableLoading}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
