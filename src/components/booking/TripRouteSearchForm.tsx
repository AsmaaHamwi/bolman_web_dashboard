import { ArrowLeftRight, CalendarDays } from 'lucide-react';
import { useRef } from 'react';
import { CityPicker, type CityOption } from '../ui/CityPicker';
import { Input } from '../ui/Input';
import { cx, getLocalDateInputValue } from '../../utils/format';
import { getIntlLocale } from '../../i18n';
import { useI18n } from '../../hooks/useI18n';

type TripRouteSearchFormProps = {
  cities: CityOption[];
  originCityId: string;
  destinationCityId: string;
  travelDate: string;
  onOriginChange: (cityId: string) => void;
  onDestinationChange: (cityId: string) => void;
  onTravelDateChange: (date: string) => void;
  onSwap: () => void;
};

function isoWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function getTomorrowDateValue() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return getLocalDateInputValue(next);
}

function getWeekendDateValue() {
  const now = new Date();
  const weekday = isoWeekday(now);
  const daysToWeekend = weekday >= 5 ? 0 : 5 - weekday;
  const target = new Date(now);
  target.setDate(target.getDate() + daysToWeekend);
  return getLocalDateInputValue(target);
}

function getActiveQuickDateMode(travelDate: string) {
  if (travelDate === getLocalDateInputValue()) return 0;
  if (travelDate === getTomorrowDateValue()) return 1;
  if (travelDate === getWeekendDateValue()) return 2;
  return null;
}

function RouteCityField({
  label,
  cities,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  cities: CityOption[];
  value: string;
  onChange: (cityId: string) => void;
  placeholder?: string;
}) {
  const selected = cities.find((city) => city.id === value);

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-extrabold text-bolman-purple">{label}</p>
      <CityPicker
        cities={cities}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        route
        selectedName={selected?.name}
      />
    </div>
  );
}

export function TripRouteSearchForm({
  cities,
  originCityId,
  destinationCityId,
  travelDate,
  onOriginChange,
  onDestinationChange,
  onTravelDateChange,
  onSwap,
}: TripRouteSearchFormProps) {
  const { messages, locale } = useI18n();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const copy = messages.company.manualBooking;
  const activeQuickDate = getActiveQuickDateMode(travelDate);
  const quickDates = [
    { label: copy.quickToday, value: getLocalDateInputValue() },
    { label: copy.quickTomorrow, value: getTomorrowDateValue() },
    { label: copy.quickWeekend, value: getWeekendDateValue() },
  ];
  const formattedDate = travelDate
    ? new Intl.DateTimeFormat(getIntlLocale(locale), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(`${travelDate}T12:00:00`))
    : copy.travelDate;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
        <RouteCityField
          label={copy.fromCity}
          cities={cities}
          value={originCityId}
          onChange={onOriginChange}
        />
        <button
          type="button"
          aria-label={copy.swapCities}
          disabled={!originCityId && !destinationCityId}
          onClick={onSwap}
          className="mt-[1.35rem] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bolman-purple/20 bg-bolman-purple/10 text-bolman-purple shadow-sm transition hover:bg-bolman-purple/15 disabled:cursor-not-allowed disabled:opacity-40 dark:border-bolman-purple/30 dark:bg-bolman-purple/15"
        >
          <ArrowLeftRight size={18} />
        </button>
        <RouteCityField
          label={copy.toCity}
          cities={cities}
          value={destinationCityId}
          onChange={onDestinationChange}
        />
      </div>

      <div className="rounded-2xl bg-slate-100/80 p-3 dark:bg-white/5">
        <p className="mb-2 text-xs font-extrabold text-bolman-purple">{copy.travelDate}</p>
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {quickDates.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onTravelDateChange(item.value)}
              className={cx(
                'rounded-full border px-2 py-2 text-xs font-bold transition',
                activeQuickDate === index
                  ? 'border-bolman-purple bg-bolman-purple text-white shadow-glow'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-bolman-purple/30 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-200',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-start transition hover:border-bolman-purple/30 dark:border-bolman-borderDark dark:bg-bolman-cardDark"
        >
          <CalendarDays size={20} className="shrink-0 text-bolman-purple" />
          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900 dark:text-white">{formattedDate}</span>
          <span className="text-xs font-semibold text-bolman-purple">{copy.changeDate}</span>
        </button>
        <Input
          ref={dateInputRef}
          type="date"
          value={travelDate}
          min={getLocalDateInputValue()}
          onChange={(e) => onTravelDateChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
