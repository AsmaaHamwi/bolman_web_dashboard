import { useMemo, useState } from 'react';
import {
  Bus,
  Calendar,
  Check,
  Clock,
  Globe,
  MapPin,
  Search,
  Send,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react';
import { useTrips } from '../../hooks/useTrips';
import { useCompanyContext } from '../../hooks/useCompanyContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../hooks/useI18n';
import {
  sendGeneralNotification,
  sendTripNotification,
  sendUserNotification,
  searchUsers,
  getTripPassengers,
} from '../../services/notification.service';
import { formatDate, formatDateTime, formatTime } from '../../utils/format';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type NotifMode = 'general' | 'trip' | 'user';

// ─────────────────────────────────────────────
// Sub-component: Trip Picker Modal
// ─────────────────────────────────────────────
function TripPickerModal({
  trips,
  selectedTripId,
  onSelect,
  onClose,
}: {
  trips: any[];
  selectedTripId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

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
      const combined = `${origin} ${destination} ${busPlate} ${dateStr} ${timeStr} ${fullDateStr} ${id}`;
      return keywords.every((kw) => combined.includes(kw));
    });
  }, [trips, searchQuery]);

  const groupedTrips = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const trip of filteredTrips) {
      const routeKey = `${trip.origin?.name ?? '-'} ⬅ ${trip.destination?.name ?? '-'}`;
      if (!map[routeKey]) map[routeKey] = [];
      map[routeKey].push(trip);
    }
    return map;
  }, [filteredTrips]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-bolman-cardDark shadow-2xl border border-slate-200 dark:border-bolman-borderDark">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-bolman-borderDark bg-slate-50/50 dark:bg-bolman-surfaceDark/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-bolman-purple text-white shadow-sm">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">اختيار وتحديد الرحلة المستهدفة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ابحث بالمدن أو المواعيد ثم انقر على الرحلة لتحديدها</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200/80 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-white dark:border-bolman-borderDark dark:bg-bolman-cardDark">
          <div className="relative flex items-center">
            <Search size={20} className="absolute start-4 text-bolman-purple pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بحسب المدن، التاريخ، الوقت، رقم الباص، أو الكود..."
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {Object.keys(groupedTrips).length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Search size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد رحلات تطابق البحث</h4>
              <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو مسح حقل البحث</p>
            </div>
          ) : (
            Object.entries(groupedTrips).map(([routeKey, routeTrips]) => (
              <div key={routeKey} className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3 shadow-sm">
                <div className="flex items-center justify-between rounded-2xl bg-bolman-purple/15 px-4 py-3 text-xs font-black text-bolman-purple dark:bg-bolman-purple/20">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span className="text-sm">المسار: {routeKey}</span>
                  </div>
                  <span className="rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-slate-800 shadow-sm dark:bg-bolman-cardDark dark:text-white">
                    {routeTrips.length} رحلات متاحة
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {routeTrips.map((trip: any) => {
                    const isSelected = selectedTripId === trip.id;
                    return (
                      <button
                        key={trip.id}
                        type="button"
                        onClick={() => { onSelect(trip.id); onClose(); }}
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
                            <span className="font-mono text-slate-500">كود: #{trip.id.slice(0, 8)}</span>
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-bolman-borderDark bg-slate-50/50 dark:bg-bolman-surfaceDark/50">
          <span className="text-xs font-bold text-slate-500">
            إجمالي الرحلات المطابقة: <strong className="text-slate-900 dark:text-white">{filteredTrips.length}</strong>
          </span>
          <Button type="button" variant="secondary" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-component: Selected Trip Badge
// ─────────────────────────────────────────────
function SelectedTripBadge({ trip, onChangeTripClick }: { trip: any; onChangeTripClick: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bolman-purple/30 bg-bolman-purple/5 p-4 dark:bg-bolman-purple/10">
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-900 dark:text-white">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-bolman-purple px-3 py-1 text-xs font-extrabold text-white shadow-sm">
          <MapPin size={14} />
          المسار: {trip.origin?.name} ⬅ {trip.destination?.name}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
          <Calendar size={14} className="text-slate-400" />
          التاريخ: {formatDate(trip.departure_datetime)}
        </span>
        <span className="inline-flex items-center gap-1 text-bolman-purple">
          <Clock size={14} />
          وقت الانطلاق: {formatTime(trip.departure_datetime)}
        </span>
        {trip.bus?.plate_number && (
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-2.5 py-0.5 text-xs font-extrabold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <Bus size={13} />
            الباص: {trip.bus.plate_number}
          </span>
        )}
        <span className="font-mono text-slate-500">كود الرحلة: #{trip.id.slice(0, 8)}</span>
      </div>
      <Button type="button" variant="secondary" onClick={onChangeTripClick} className="gap-2 text-xs py-2 shadow-sm">
        <SlidersHorizontal size={14} />
        تغيير الرحلة
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-component: Trip Passengers Picker
// Used for "trip_selected" and "user from trip"
// ─────────────────────────────────────────────
function TripPassengersPicker({
  tripId,
  selectedUserIds,
  onToggle,
  singleSelect,
}: {
  tripId: string;
  selectedUserIds: string[];
  onToggle: (userId: string) => void;
  singleSelect?: boolean;
}) {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [passengerSearch, setPassengerSearch] = useState('');

  // Load passengers when tripId changes
  useMemo(() => {
    if (!tripId) { setPassengers([]); setLoaded(false); return; }
    setLoading(true);
    getTripPassengers(tripId)
      .then((data) => { setPassengers(data); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [tripId]);

  const filtered = useMemo(() => {
    const q = passengerSearch.trim().toLowerCase();
    if (!q) return passengers;
    return passengers.filter((p: any) =>
      (p.full_name || '').toLowerCase().includes(q) || (p.phone || '').includes(q)
    );
  }, [passengers, passengerSearch]);

  if (!tripId) return null;

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-bolman-purple border-t-transparent" />
        جاري تحميل المسافرين...
      </div>
    );
  }

  if (loaded && passengers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 py-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <Users size={28} className="mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">لا يوجد مسافرون مسجلون لهذه الرحلة</p>
        <p className="text-xs text-slate-400">فقط المستخدمون الذين لديهم حجز مؤكد يظهرون هنا</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search passengers */}
      <div className="relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={passengerSearch}
          onChange={(e) => setPassengerSearch(e.target.value)}
          placeholder="ابحث باسم المسافر أو رقم الهاتف..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm text-slate-900 placeholder-slate-400 focus:border-bolman-purple focus:outline-none focus:ring-2 focus:ring-bolman-purple/10 dark:border-slate-700 dark:bg-bolman-surfaceDark dark:text-white"
        />
        {passengerSearch && (
          <button
            type="button"
            onClick={() => setPassengerSearch('')}
            className="absolute end-3 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Passengers list */}
      <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">لا توجد نتائج تطابق البحث</div>
        ) : (
          filtered.map((p: any) => {
            const isSelected = selectedUserIds.includes(p.user_id);
            return (
              <button
                key={p.user_id}
                type="button"
                onClick={() => onToggle(p.user_id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-all hover:bg-slate-50 dark:hover:bg-bolman-surfaceDark/50 ${
                  isSelected ? 'bg-bolman-purple/5 dark:bg-bolman-purple/10' : ''
                }`}
              >
                <div className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2 transition-all ${
                  isSelected
                    ? 'border-bolman-purple bg-bolman-purple text-white'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-transparent'
                }`}>
                  {isSelected && <Check size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.full_name}</p>
                  {p.phone && <p className="text-xs text-slate-500 dark:text-slate-400">{p.phone}</p>}
                </div>
                {isSelected && (
                  <span className="rounded-full bg-bolman-purple/10 px-2 py-0.5 text-[10px] font-bold text-bolman-purple">
                    محدد
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Count badge */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{filtered.length} مسافر ظاهر</span>
        {!singleSelect && selectedUserIds.length > 0 && (
          <span className="font-bold text-bolman-purple">{selectedUserIds.length} محدد</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-component: User Search (system-wide)
// ─────────────────────────────────────────────
function UserSearchPicker({
  selectedUserId,
  selectedUserName,
  onSelect,
}: {
  selectedUserId: string;
  selectedUserName: string;
  onSelect: (user: { id: string; full_name: string; phone: string | null }) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchUsers(query.trim());
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm text-slate-900 placeholder-slate-400 focus:border-bolman-purple focus:outline-none focus:ring-2 focus:ring-bolman-purple/10 dark:border-slate-700 dark:bg-bolman-surfaceDark dark:text-white"
          />
        </div>
        <Button type="submit" disabled={!query.trim() || loading} className="gap-1.5 px-4 py-2.5 text-xs">
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search size={15} />
          )}
          بحث
        </Button>
      </form>

      {/* Selected user badge */}
      {selectedUserId && (
        <div className="flex items-center justify-between rounded-2xl border border-bolman-purple/30 bg-bolman-purple/5 px-4 py-3 dark:bg-bolman-purple/10">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-bolman-purple/20 text-bolman-purple">
              <User size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUserName}</p>
              <p className="text-xs text-slate-500">مستخدم محدد</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-bolman-purple px-2.5 py-0.5 text-[10px] font-extrabold text-white">
            <Check size={12} /> محدد
          </span>
        </div>
      )}

      {/* Search results */}
      {searched && !loading && (
        <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
          {results.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">لا توجد نتائج</div>
          ) : (
            results.map((u: any) => {
              const isSelected = selectedUserId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onSelect(u); setResults([]); setSearched(false); setQuery(''); }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-all hover:bg-slate-50 dark:hover:bg-bolman-surfaceDark/50 ${
                    isSelected ? 'bg-bolman-purple/5 dark:bg-bolman-purple/10' : ''
                  }`}
                >
                  <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{u.full_name}</p>
                    {u.phone && <p className="text-xs text-slate-500">{u.phone}</p>}
                  </div>
                  {isSelected && <Check size={16} className="text-bolman-purple flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export function NotificationsPage() {
  const { data: companyId } = useCompanyContext();
  const { data: trips = [] } = useTrips(companyId, { enabled: !!companyId });
  const { messages } = useI18n();

  // Active tab
  const [mode, setMode] = useState<NotifMode>('general');

  // Shared fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trip mode state
  const [tripId, setTripId] = useState('');
  const [tripAudience, setTripAudience] = useState<'all' | 'selected'>('all');
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  // User mode state
  const [userSource, setUserSource] = useState<'system' | 'trip'>('system');
  const [userTripId, setUserTripId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [isUserTripModalOpen, setIsUserTripModalOpen] = useState(false);

  const selectedTrip = useMemo(() => trips.find((t: any) => t.id === tripId), [trips, tripId]);
  const selectedUserTrip = useMemo(() => trips.find((t: any) => t.id === userTripId), [trips, userTripId]);

  // Clear dependent state when mode changes
  function switchMode(newMode: NotifMode) {
    setMode(newMode);
    setDone('');
    setTitle('');
    setMessage('');
    if (newMode !== 'trip') { setTripId(''); setSelectedPassengerIds([]); setTripAudience('all'); }
    if (newMode !== 'user') { setUserTripId(''); setSelectedUserId(''); setSelectedUserName(''); setUserSource('system'); }
  }

  function togglePassenger(userId: string) {
    setSelectedPassengerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function toggleUserFromTrip(userId: string) {
    // single select for user mode
    if (selectedUserId === userId) {
      setSelectedUserId('');
      setSelectedUserName('');
    } else {
      const trip = trips.find((t: any) => t.id === userTripId);
      // Name will be populated from the passengers list via the component
      setSelectedUserId(userId);
    }
  }

  function isSubmitDisabled(): boolean {
    if (!title || !message || isSubmitting) return true;
    if (mode === 'trip') {
      if (!tripId) return true;
      if (tripAudience === 'selected' && selectedPassengerIds.length === 0) return true;
    }
    if (mode === 'user') {
      if (!selectedUserId) return true;
      if (userSource === 'trip' && !userTripId) return true;
    }
    return false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setDone('');
    try {
      if (mode === 'general') {
        await sendGeneralNotification({ title, message });
      } else if (mode === 'trip') {
        if (tripAudience === 'all') {
          await sendTripNotification({ trip_id: tripId, title, message, type: 'trip_notice' });
        } else {
          await sendTripNotification({ trip_id: tripId, title, message, type: 'trip_notice', user_ids: selectedPassengerIds });
        }
      } else if (mode === 'user') {
        await sendUserNotification({
          user_id: selectedUserId,
          title,
          message,
          trip_id: userSource === 'trip' ? userTripId : undefined,
        });
      }
      setDone(messages.company.notifications.success);
      setTitle('');
      setMessage('');
      setSelectedPassengerIds([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Mode config for tabs
  const tabs: { key: NotifMode; label: string; icon: React.ReactNode; description: string }[] = [
    {
      key: 'general',
      label: 'إشعار عام',
      icon: <Globe size={18} />,
      description: 'إرسال لكل مستخدمي التطبيق',
    },
    {
      key: 'trip',
      label: 'رحلة محددة',
      icon: <Bus size={18} />,
      description: 'إرسال لمسافري رحلة بعينها',
    },
    {
      key: 'user',
      label: 'مستخدم واحد',
      icon: <User size={18} />,
      description: 'إرسال لمستخدم محدد',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={messages.company.notifications.title} subtitle={messages.company.notifications.subtitle} />

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchMode(tab.key)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all ${
              mode === tab.key
                ? 'border-bolman-purple bg-bolman-purple/5 text-bolman-purple dark:bg-bolman-purple/10'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-slate-400 dark:hover:bg-bolman-surfaceDark'
            }`}
          >
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ${
              mode === tab.key ? 'bg-bolman-purple text-white shadow-glow' : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              {tab.icon}
            </div>
            <div>
              <p className={`text-sm font-extrabold ${mode === tab.key ? 'text-bolman-purple' : 'text-slate-800 dark:text-white'}`}>
                {tab.label}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{tab.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Form Card */}
      <Card className="w-full">
        {/* Card Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-bolman-borderDark">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-bolman-purple/10 text-bolman-purple">
            {mode === 'general' ? <Globe size={20} /> : mode === 'trip' ? <Bus size={20} /> : <User size={20} />}
          </div>
          <div>
            <CardTitle>
              {mode === 'general' ? 'إشعار عام لكل المستخدمين' : mode === 'trip' ? 'إشعار رحلة' : 'إشعار مستخدم'}
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {mode === 'general'
                ? 'سيصل هذا الإشعار لجميع مستخدمي التطبيق المسجلين'
                : mode === 'trip'
                ? 'قم باختيار الرحلة المطلوبة وتحديد المستهدفين من مسافريها'
                : 'ابحث عن مستخدم محدد وأرسل له إشعاراً مخصصاً'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-6">

          {/* ── TRIP MODE: Trip Selector + Audience ── */}
          {mode === 'trip' && (
            <div className="space-y-5">
              {/* Trip selector */}
              <Field label={messages.company.notifications.trip}>
                {selectedTrip ? (
                  <SelectedTripBadge trip={selectedTrip} onChangeTripClick={() => setIsTripModalOpen(true)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTripModalOpen(true)}
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

              {/* Audience selection (only after trip is chosen) */}
              {tripId && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">المستهدفون بالإشعار</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'all', label: 'كل المسافرين', desc: 'إرسال لجميع مسافري الرحلة', icon: <Users size={16} /> },
                      { value: 'selected', label: 'مسافرون محددون', desc: 'اختر مسافرين بعينهم', icon: <User size={16} /> },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setTripAudience(opt.value as 'all' | 'selected'); setSelectedPassengerIds([]); }}
                        className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition-all ${
                          tripAudience === opt.value
                            ? 'border-bolman-purple bg-bolman-purple/5 dark:bg-bolman-purple/10'
                            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-bolman-surfaceDark/30'
                        }`}
                      >
                        <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl ${
                          tripAudience === opt.value ? 'bg-bolman-purple text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {opt.icon}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${tripAudience === opt.value ? 'text-bolman-purple' : 'text-slate-800 dark:text-white'}`}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-slate-500">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Passenger checkboxes for "selected" mode */}
                  {tripAudience === 'selected' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-bolman-surfaceDark/30 space-y-3">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">اختر المسافرين المستهدفين (الحد الأدنى: 1)</p>
                      <TripPassengersPicker
                        tripId={tripId}
                        selectedUserIds={selectedPassengerIds}
                        onToggle={togglePassenger}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── USER MODE ── */}
          {mode === 'user' && (
            <div className="space-y-5">
              {/* User Source */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">مصدر اختيار المستخدم</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'system', label: 'من النظام', desc: 'بحث عام بالاسم أو الهاتف', icon: <Globe size={16} /> },
                    { value: 'trip', label: 'من رحلة محددة', desc: 'اختر مسافراً من رحلة بعينها', icon: <Bus size={16} /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setUserSource(opt.value as 'system' | 'trip');
                        setSelectedUserId('');
                        setSelectedUserName('');
                        setUserTripId('');
                      }}
                      className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition-all ${
                        userSource === opt.value
                          ? 'border-bolman-purple bg-bolman-purple/5 dark:bg-bolman-purple/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-bolman-surfaceDark/30'
                      }`}
                    >
                      <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl ${
                        userSource === opt.value ? 'bg-bolman-purple text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>
                        {opt.icon}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${userSource === opt.value ? 'text-bolman-purple' : 'text-slate-800 dark:text-white'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-slate-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* System search */}
              {userSource === 'system' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-bolman-surfaceDark/30 space-y-2">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">ابحث عن المستخدم</p>
                  <UserSearchPicker
                    selectedUserId={selectedUserId}
                    selectedUserName={selectedUserName}
                    onSelect={(u) => { setSelectedUserId(u.id); setSelectedUserName(u.full_name); }}
                  />
                </div>
              )}

              {/* Trip-based user selection */}
              {userSource === 'trip' && (
                <div className="space-y-4">
                  <Field label="الرحلة">
                    {selectedUserTrip ? (
                      <SelectedTripBadge trip={selectedUserTrip} onChangeTripClick={() => setIsUserTripModalOpen(true)} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsUserTripModalOpen(true)}
                        className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-4 text-start transition-all hover:border-bolman-purple hover:bg-bolman-purple/5 dark:border-slate-700 dark:bg-bolman-surfaceDark/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-bolman-purple/10 text-bolman-purple">
                            <Search size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">اضغط لاختيار الرحلة</h4>
                            <p className="text-xs text-slate-500">ثم ستتمكن من اختيار مسافر من هذه الرحلة</p>
                          </div>
                        </div>
                        <span className="rounded-xl bg-bolman-purple px-4 py-2 text-xs font-bold text-white shadow-sm">
                          عرض الرحلات 🔍
                        </span>
                      </button>
                    )}
                  </Field>

                  {/* Passengers list (single select) */}
                  {userTripId && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-bolman-surfaceDark/30 space-y-3">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">اختر المسافر المستهدف</p>
                      <TripPassengersPicker
                        tripId={userTripId}
                        selectedUserIds={selectedUserId ? [selectedUserId] : []}
                        onToggle={(uid) => {
                          if (selectedUserId === uid) {
                            setSelectedUserId('');
                            setSelectedUserName('');
                          } else {
                            setSelectedUserId(uid);
                          }
                        }}
                        singleSelect
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SHARED: Title + Message ── */}
          <Field label={messages.common.title}>
            <Input
              required
              placeholder={
                mode === 'general'
                  ? 'مثال: إشعار مهم للمستخدمين...'
                  : mode === 'trip'
                  ? 'مثال: تنبيه بخصوص موعد انطلاق الرحلة...'
                  : 'مثال: رسالة مخصصة لك...'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label={messages.common.message}>
            <Textarea
              required
              rows={4}
              placeholder={
                mode === 'general'
                  ? 'اكتب نص الإشعار العام الموجه لكل المستخدمين...'
                  : mode === 'trip'
                  ? 'اكتب نص الإشعار الموجه لركاب هذه الرحلة...'
                  : 'اكتب نص الإشعار الموجه لهذا المستخدم...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitDisabled()} className="w-full gap-2 shadow-glow py-3">
            <Send size={18} />
            {mode === 'general'
              ? 'إرسال لكل المستخدمين'
              : mode === 'trip'
              ? tripAudience === 'selected'
                ? `إرسال للمسافرين المحددين (${selectedPassengerIds.length})`
                : 'إرسال لكل مسافري الرحلة'
              : 'إرسال للمستخدم المحدد'}
          </Button>

          {/* Success message */}
          {done && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {done}
            </div>
          )}
        </form>
      </Card>

      {/* Trip Picker Modals */}
      {isTripModalOpen && (
        <TripPickerModal
          trips={trips}
          selectedTripId={tripId}
          onSelect={(id) => { setTripId(id); setSelectedPassengerIds([]); }}
          onClose={() => setIsTripModalOpen(false)}
        />
      )}
      {isUserTripModalOpen && (
        <TripPickerModal
          trips={trips}
          selectedTripId={userTripId}
          onSelect={(id) => { setUserTripId(id); setSelectedUserId(''); setSelectedUserName(''); }}
          onClose={() => setIsUserTripModalOpen(false)}
        />
      )}
    </div>
  );
}
