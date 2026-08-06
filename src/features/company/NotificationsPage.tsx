import { useMemo, useState } from 'react';
import {
  Bus,
  Calendar,
  Check,
  Clock,
  MapPin,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useTrips } from '../../hooks/useTrips';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../hooks/useI18n';
import { sendTripNotification } from '../../services/notification.service';
import { formatDate, formatDateTime, formatTime } from '../../utils/format';

export function NotificationsPage() {
  const { data: companyId } = useCompanyContext();
  const { data: trips = [] } = useTrips(companyId, { enabled: !!companyId });
  const { messages } = useI18n();

  const [form, setForm] = useState({ trip_id: '', title: '', message: '' });
  const [done, setDone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Currently selected trip object
  const selectedTrip = useMemo(() => {
    return trips.find((t: any) => t.id === form.trip_id);
  }, [trips, form.trip_id]);

  // Multi-keyword Filtered Trips (e.g. "حلب حمص")
  const filteredTrips = useMemo(() => {
    const rawQ = searchQuery.trim().toLowerCase();
    if (!rawQ) return trips;

    const keywords = rawQ.split(/[\s\-\—\←\⬅]+/).filter(Boolean);

    return trips.filter((trip: any) => {
      const origin = (trip.origin?.name || '').toLowerCase();
      const destination = (trip.destination?.name || '').toLowerCase();
      const busPlate = (trip.bus?.plate_number || '').toLowerCase();
      const dateStr = trip.departure_datetime ? formatDate(trip.departure_datetime).toLowerCase() : '';
      const timeStr = trip.departure_datetime ? formatTime(trip.departure_datetime).toLowerCase() : '';
      const fullDateStr = trip.departure_datetime ? formatDateTime(trip.departure_datetime).toLowerCase() : '';
      const id = (trip.id || '').toLowerCase();

      const combinedText = `${origin} ${destination} ${busPlate} ${dateStr} ${timeStr} ${fullDateStr} ${id}`;

      return keywords.every((kw) => combinedText.includes(kw));
    });
  }, [trips, searchQuery]);

  // Group filtered trips by Route
  const groupedTrips = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const trip of filteredTrips) {
      const routeKey = `${trip.origin?.name ?? '-'} ⬅ ${trip.destination?.name ?? '-'}`;
      if (!map[routeKey]) map[routeKey] = [];
      map[routeKey].push(trip);
    }
    return map;
  }, [filteredTrips]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.trip_id || !form.title || !form.message) return;

    setIsSubmitting(true);
    try {
      await sendTripNotification({ ...form, type: 'trip_notice' });
      setDone(messages.company.notifications.success);
      setForm({ trip_id: '', title: '', message: '' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={messages.company.notifications.title} subtitle={messages.company.notifications.subtitle} />

      {/* Full-width Card Container */}
      <Card className="w-full">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-bolman-borderDark">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-bolman-purple/10 text-bolman-purple">
            <Send size={20} />
          </div>
          <div>
            <CardTitle>{messages.company.notifications.cardTitle}</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              قم باختيار الرحلة المطلوبة وكتابة الرسالة الموجهة لركاب هذه الرحلة
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-6">
          {/* Trip Selection Trigger Field */}
          <Field label={messages.company.notifications.trip}>
            {selectedTrip ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bolman-purple/30 bg-bolman-purple/5 p-4 dark:bg-bolman-purple/10">
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-bolman-purple px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                    <MapPin size={14} />
                    المسار: {selectedTrip.origin?.name} ⬅ {selectedTrip.destination?.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                    <Calendar size={14} className="text-slate-400" />
                    التاريخ: {formatDate(selectedTrip.departure_datetime)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-bolman-purple">
                    <Clock size={14} />
                    وقت الانطلاق: {formatTime(selectedTrip.departure_datetime)}
                  </span>
                  {selectedTrip.bus?.plate_number && (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-2.5 py-0.5 text-xs font-extrabold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      <Bus size={13} />
                      الباص: {selectedTrip.bus.plate_number}
                    </span>
                  )}
                  <span className="font-mono text-slate-500">
                    كود الرحلة: #{selectedTrip.id.slice(0, 8)}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(true)}
                  className="gap-2 text-xs py-2 shadow-sm"
                >
                  <SlidersHorizontal size={14} />
                  تغيير الرحلة
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-4 text-start transition-all hover:border-bolman-purple hover:bg-bolman-purple/5 dark:border-slate-700 dark:bg-bolman-surfaceDark/50 dark:hover:border-bolman-purple"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-bolman-purple/10 text-bolman-purple">
                    <Search size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">اضغط هنا لاختيار وتحديد الرحلة المستهدفة</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ستظهر شاشة منبثقة تتيح لك البحث السريع بأسماء المدن والمواعيد</p>
                  </div>
                </div>
                <span className="rounded-xl bg-bolman-purple px-4 py-2 text-xs font-bold text-white shadow-sm">
                  عرض الرحلات المتاحة 🔍
                </span>
              </button>
            )}
          </Field>

          {/* Notification Title Input */}
          <Field label={messages.common.title}>
            <Input
              required
              placeholder="مثال: تنبيه بخصوص موعد انطلاق الرحلة..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>

          {/* Notification Message Content */}
          <Field label={messages.common.message}>
            <Textarea
              required
              rows={4}
              placeholder="اكتب نص الإشعار الموجه لركاب هذه الرحلة..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </Field>

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting || !form.trip_id} className="w-full gap-2 shadow-glow py-3">
            <Send size={18} />
            {messages.company.notifications.send}
          </Button>

          {done && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {done}
            </div>
          )}
        </form>
      </Card>

      {/* TRIP SELECTION POPUP MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-bolman-cardDark shadow-2xl border border-slate-200 dark:border-bolman-borderDark">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-bolman-borderDark bg-slate-50/50 dark:bg-bolman-surfaceDark/50">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-bolman-purple text-white shadow-sm">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">اختيار وتحديد الرحلة المستهدفة</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ابحث بالمدن أو المواعيد ثم انقر على الرحلة لتحديدها للإشعار</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200/80 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sticky Search Input Bar in Modal */}
            <div className="p-4 border-b border-slate-100 bg-white dark:border-bolman-borderDark dark:bg-bolman-cardDark">
              <div className="relative flex items-center">
                <Search size={20} className="absolute start-4 text-bolman-purple pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بحسب المدن (مثال: حلب حمص)، التاريخ، الوقت، رقم الباص، أو الكود..."
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 ps-12 pe-12 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-bolman-purple focus:bg-white focus:outline-none focus:ring-4 focus:ring-bolman-purple/10 dark:border-slate-700 dark:bg-bolman-surfaceDark dark:text-white dark:placeholder-slate-500 shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-4 grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {Object.keys(groupedTrips).length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <Search size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد رحلات تطابق البحث ({searchQuery})</h4>
                  <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو مسح حقل البحث</p>
                </div>
              ) : (
                Object.entries(groupedTrips).map(([routeKey, routeTrips]) => (
                  <div key={routeKey} className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3 shadow-sm">
                    {/* Route Group Header Banner */}
                    <div className="flex items-center justify-between rounded-2xl bg-bolman-purple/15 px-4 py-3 text-xs font-black text-bolman-purple dark:bg-bolman-purple/20">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span className="text-sm">المسار: {routeKey}</span>
                      </div>
                      <span className="rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-slate-800 shadow-sm dark:bg-bolman-cardDark dark:text-white">
                        {routeTrips.length} رحلات متاحة
                      </span>
                    </div>

                    {/* Trip Cards Grid */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {routeTrips.map((trip: any) => {
                        const isSelected = form.trip_id === trip.id;
                        return (
                          <button
                            key={trip.id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, trip_id: trip.id });
                              setIsModalOpen(false);
                            }}
                            className={`flex flex-col justify-between rounded-2xl p-4 text-start transition-all shadow-sm ${
                              isSelected
                                ? 'bg-bolman-purple/15 border-2 border-bolman-purple text-slate-900 dark:text-white ring-2 ring-bolman-purple/20'
                                : 'bg-white hover:bg-slate-100 dark:bg-bolman-cardDark dark:hover:bg-bolman-surfaceDark border border-slate-200/80 dark:border-slate-800'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  <span className="text-slate-500 font-normal">التاريخ: </span>
                                  {formatDate(trip.departure_datetime)}
                                </span>
                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-bolman-purple px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                                    <Check size={12} /> محددة
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs font-black text-bolman-purple">
                                <Clock size={15} />
                                <span>وقت الانطلاق: {formatTime(trip.departure_datetime)}</span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                                {trip.bus?.plate_number && (
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    <span className="text-slate-400 font-normal">الباص: </span>
                                    {trip.bus.plate_number}
                                  </span>
                                )}
                                <span className="font-mono text-slate-500">
                                  كود: #{trip.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-bolman-borderDark bg-slate-50/50 dark:bg-bolman-surfaceDark/50">
              <span className="text-xs font-bold text-slate-500">
                إجمالي الرحلات المطابقة: <strong className="text-slate-900 dark:text-white">{filteredTrips.length}</strong>
              </span>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                إغلاق
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
