import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { useI18n } from '../../hooks/useI18n';
import { useTrips } from '../../hooks/useTrips';
import { formatDateTime, formatMoney } from '../../utils/format';

export function GlobalTripsPage() {
  const { data = [], isPending } = useTrips();
  const { messages } = useI18n();

  return (
    <div>
      <PageHeader title={messages.system.trips.title} subtitle={messages.system.trips.subtitle} />
      <DataTable columns={messages.system.trips.table as unknown as string[]} loading={isPending} empty={!isPending && !data.length}>
        {data.map((trip: any) => (
          <tr key={trip.id}>
            <Td>{trip.company?.name}</Td>
            <Td className="font-bold">{trip.origin?.name} ← {trip.destination?.name}</Td>
            <Td>{trip.bus?.number_bus}</Td>
            <Td>{trip.driver?.user?.full_name}</Td>
            <Td>{formatDateTime(trip.departure_datetime)}</Td>
            <Td>{formatMoney(trip.price_offer ?? trip.price)}</Td>
            <Td><StatusBadge value={trip.status} /></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
