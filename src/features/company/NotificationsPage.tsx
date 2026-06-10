import { useState } from 'react';
import { useTrips } from '../../hooks/useTrips';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Select, Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../hooks/useI18n';
import { sendTripNotification } from '../../services/notification.service';

export function NotificationsPage() {
  const { data: companyId } = useCompanyContext();
  const { data: trips = [] } = useTrips(companyId, { enabled: !!companyId });
  const { messages } = useI18n();
  const [form, setForm] = useState({ trip_id: '', title: '', message: '' });
  const [done, setDone] = useState('');

  async function submit() {
    await sendTripNotification({ ...form, type: 'trip_notice' });
    setDone(messages.company.notifications.success);
  }

  return (
    <div>
      <PageHeader title={messages.company.notifications.title} subtitle={messages.company.notifications.subtitle} />
      <Card className="max-w-3xl">
        <CardTitle>{messages.company.notifications.cardTitle}</CardTitle>
        <div className="mt-4 grid gap-4">
          <Field label={messages.company.notifications.trip}>
            <Select value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })}>
              <option value="">{messages.common.choose}</option>
              {trips.map((trip: any) => <option key={trip.id} value={trip.id}>{trip.origin?.name} ← {trip.destination?.name}</option>)}
            </Select>
          </Field>
          <Field label={messages.common.title}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={messages.common.message}>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </Field>
          <Button onClick={submit}>{messages.company.notifications.send}</Button>
          {done && <p className="text-sm text-emerald-500">{done}</p>}
        </div>
      </Card>
    </div>
  );
}
