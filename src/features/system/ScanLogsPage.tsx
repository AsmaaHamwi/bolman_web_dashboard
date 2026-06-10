import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { useI18n } from '../../hooks/useI18n';
import { listScanLogs } from '../../services/qr.service';
import { formatDateTime } from '../../utils/format';

export function ScanLogsPage() {
  const { data = [], isPending } = useQuery({ queryKey: ['scan-logs'], queryFn: () => listScanLogs() });
  const { messages } = useI18n();

  return (
    <div>
      <PageHeader title={messages.system.scanLogs.title} subtitle={messages.system.scanLogs.subtitle} />
      <DataTable columns={messages.system.scanLogs.table as unknown as string[]} loading={isPending} empty={!isPending && !data.length}>
        {data.map((log: any) => (
          <tr key={log.id}>
            <Td>{formatDateTime(log.scanned_at)}</Td>
            <Td>{log.ticket?.ticket_code}</Td>
            <Td>{log.trip?.origin?.name} ← {log.trip?.destination?.name}</Td>
            <Td>{log.driver?.user?.full_name}</Td>
            <Td><StatusBadge value={log.scan_result} /></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
