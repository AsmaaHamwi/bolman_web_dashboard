import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Td } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Status';
import { Modal } from '../../components/ui/Modal';
import { Field, Input } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useCities, useCreateCity, useUpdateCity } from '../../hooks/useCities';

export function CitiesPage() {
  const { data = [], isPending } = useCities();
  const create = useCreateCity();
  const update = useUpdateCity();
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  return (
    <div>
      <PageHeader
        title={messages.system.cities.title}
        subtitle={messages.system.cities.subtitle}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} />
            {messages.system.cities.addButton}
          </Button>
        }
      />
      <DataTable columns={messages.system.cities.table as unknown as string[]} loading={isPending} empty={!isPending && !data.length}>
        {data.map((city: any) => (
          <tr key={city.id}>
            <Td className="font-bold">{city.name}</Td>
            <Td><StatusBadge value={city.is_active ? 'active' : 'inactive'} /></Td>
            <Td>
              <Button variant="secondary" onClick={() => update.mutate({ id: city.id, patch: { is_active: !city.is_active } })}>
                {city.is_active ? messages.common.disable : messages.common.enable}
              </Button>
            </Td>
          </tr>
        ))}
      </DataTable>
      <Modal open={open} onClose={() => setOpen(false)} title={messages.system.cities.modalTitle}>
        <div className="space-y-4">
          <Field label={messages.system.cities.cityName}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button
            onClick={() =>
              create.mutate(name, {
                onSuccess: () => {
                  setName('');
                  setOpen(false);
                },
              })
            }
          >
            {messages.common.save}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
