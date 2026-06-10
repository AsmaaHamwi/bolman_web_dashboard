import { useUpdateTrip, useTrips } from '../../hooks/useTrips';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../hooks/useI18n';
import { formatMoney } from '../../utils/format';

export function OffersPage() {
  const company = useCompanyContext();
  const companyId = company.data;
  const { data = [], isPending } = useTrips(companyId, { enabled: !!companyId });
  const update = useUpdateTrip();
  const { messages } = useI18n();
  const loading = company.isPending || isPending;

  return (
    <div>
      <PageHeader title={messages.company.offers.title} subtitle={messages.company.offers.subtitle} />
      <DataTable columns={messages.company.offers.table as unknown as string[]} loading={loading} empty={!loading && !data.length}>
        {data.map((trip: any) => (
          <tr key={trip.id}>
            <Td>{trip.origin?.name} ← {trip.destination?.name}</Td>
            <Td>{formatMoney(trip.price)}</Td>
            <Td>{trip.price_offer ? formatMoney(trip.price_offer) : '-'}</Td>
            <Td>{trip.title_offer || '-'}</Td>
            <Td>
              <Button
                variant="secondary"
                onClick={() =>
                  update.mutate({
                    id: trip.id,
                    patch: {
                      offer_is: !trip.offer_is,
                      price_offer: trip.offer_is ? null : trip.price * 0.85,
                      title_offer: trip.offer_is ? null : messages.company.offers.specialOffer,
                    },
                  })
                }
              >
                {trip.offer_is ? messages.common.remove : messages.company.offers.activateOffer}
              </Button>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
