import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Sparkles, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CityPicker, type CityOption } from '../ui/CityPicker';
import { Calendar } from '../ui/Calendar';
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

function getTodayDateValue(): string {
  return getLocalDateInputValue(new Date());
}

function getTomorrowDateValue(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return getLocalDateInputValue(next);
}

function getWeekendDateValue(): string {
  const now = new Date();
  const day = now.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  // In Syria and the Arab world, the main weekend is Friday (5) & Saturday (6).
  let daysToAdd = 0;
  if (day === 5) {
    daysToAdd = 0; // Today is Friday
  } else if (day === 6) {
    daysToAdd = 6; // Upcoming Friday
  } else {
    daysToAdd = 5 - day; // Sun->5, Mon->4, Tue->3, Wed->2, Thu->1
  }
  const target = new Date(now);
  target.setDate(target.getDate() + daysToAdd);
  return getLocalDateInputValue(target);
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
  const { messages, locale, isArabic } = useI18n();
  const copy = messages.company.manualBooking;

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  const todayVal = getTodayDateValue();
  const tomorrowVal = getTomorrowDateValue();
  const weekendVal = getWeekendDateValue();

  const [selectedQuick, setSelectedQuick] = useState<'today' | 'tomorrow' | 'weekend' | null>(() => {
    if (travelDate === todayVal) return 'today';
    if (travelDate === tomorrowVal) return 'tomorrow';
    if (travelDate === weekendVal) return 'weekend';
    return null;
  });

  useEffect(() => {
    if (travelDate === todayVal && selectedQuick === 'today') return;
    if (travelDate === tomorrowVal && selectedQuick === 'tomorrow') return;
    if (travelDate === weekendVal && selectedQuick === 'weekend') return;

    if (travelDate === todayVal) {
      setSelectedQuick('today');
    } else if (travelDate === tomorrowVal) {
      setSelectedQuick('tomorrow');
    } else if (travelDate === weekendVal) {
      setSelectedQuick('weekend');
    } else {
      setSelectedQuick(null);
    }
  }, [travelDate, todayVal, tomorrowVal, weekendVal, selectedQuick]);

  const quickOptions = [
    {
      key: 'today' as const,
      label: copy.quickToday,
      value: todayVal,
    },
    {
      key: 'tomorrow' as const,
      label: copy.quickTomorrow,
      value: tomorrowVal,
    },
    {
      key: 'weekend' as const,
      label: copy.quickWeekend,
      value: weekendVal,
    },
  ];

  const handleQuickClick = (option: (typeof quickOptions)[0]) => {
    setSelectedQuick(option.key);
    onTravelDateChange(option.value);
  };

  const handleStepDay = (delta: number) => {
    const current = new Date(`${travelDate || todayVal}T12:00:00`);
    const next = new Date(current);
    next.setDate(next.getDate() + delta);

    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);

    if (delta < 0 && next < minDate) {
      return;
    }

    const nextVal = getLocalDateInputValue(next);
    onTravelDateChange(nextVal);
  };

  const isMinDate = travelDate <= todayVal;

  const formattedDate = travelDate
    ? new Intl.DateTimeFormat(getIntlLocale(locale), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${travelDate}T12:00:00`))
    : copy.travelDate;

  return (
    <div className="space-y-4">
      {/* Route Fields with Swap button */}
      <div className="space-y-3">
        {/* From City */}
        <div className="space-y-1.5 text-start">
          <label className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{copy.fromCity}</span>
          </label>
          <CityPicker
            cities={cities}
            value={originCityId}
            onChange={onOriginChange}
            placeholder={copy.fromCity}
            route
          />
        </div>

        {/* Swap Button - Compact Row */}
        <div className="flex justify-center -my-1.5 relative z-10">
          <button
            type="button"
            aria-label={copy.swapCities}
            disabled={!originCityId && !destinationCityId}
            onClick={onSwap}
            className={cx(
              'group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-bolman-purple shadow-xs hover:border-bolman-purple/50 hover:bg-bolman-purple hover:text-white dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:hover:bg-bolman-purple dark:hover:text-white transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <ArrowLeftRight
              size={14}
              className="group-hover:rotate-180 transition-transform duration-300"
            />
          </button>
        </div>

        {/* To City */}
        <div className="space-y-1.5 text-start">
          <label className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-bolman-purple" />
            <span>{copy.toCity}</span>
          </label>
          <CityPicker
            cities={cities}
            value={destinationCityId}
            onChange={onDestinationChange}
            placeholder={copy.toCity}
            route
          />
        </div>
      </div>

      {/* Travel Date */}
      <div className="space-y-1.5 text-start pt-3 border-t border-slate-100 dark:border-bolman-borderDark/60">
        <label className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <CalendarDays size={14} className="text-bolman-purple" />
          <span>{copy.travelDate}</span>
        </label>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex w-full items-center gap-2 text-start outline-none transition focus:border-bolman-purple focus:ring-4 focus:ring-bolman-purple/10 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-xs hover:border-bolman-purple/50 hover:shadow-sm dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:hover:border-bolman-purple/50"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900 dark:text-white">
                {formattedDate}
              </span>
              <ChevronDown size={16} className="shrink-0 text-slate-400" />
            </button>

            {isCalendarOpen && (
              <div
                className={cx(
                  'absolute bottom-full mb-2 z-50 rounded-3xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-200/50 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:shadow-black/40 animate-bolman-modal-in origin-bottom',
                  isArabic ? 'right-0' : 'left-0',
                )}
              >
                <Calendar
                  value={travelDate}
                  onChange={(date) => {
                    onTravelDateChange(date);
                    setIsCalendarOpen(false);
                  }}
                  minDate={todayVal}
                  locale={locale}
                  isArabic={isArabic}
                />
              </div>
            )}
          </div>

          {/* Steppers */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={isMinDate}
              onClick={() => handleStepDay(-1)}
              title="اليوم السابق"
              className={cx(
                'flex h-10 w-9 items-center justify-center rounded-xl border transition-all',
                'border-slate-200/90 bg-white text-slate-700 hover:border-bolman-purple/40 hover:bg-bolman-purple/5 hover:text-bolman-purple dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-slate-200',
                'disabled:cursor-not-allowed disabled:opacity-30',
              )}
            >
              {isArabic ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>

            <button
              type="button"
              onClick={() => handleStepDay(1)}
              title="اليوم التالي"
              className="flex h-10 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 transition-all hover:border-bolman-purple/40 hover:bg-bolman-purple/5 hover:text-bolman-purple dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-slate-200"
            >
              {isArabic ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Date Chips */}
      <div className="flex flex-wrap gap-1 pt-1.5">
        {quickOptions.map((opt) => {
          const isActive = selectedQuick === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleQuickClick(opt)}
              className={cx(
                'rounded-xl px-2.5 py-1 text-[11px] font-black transition-all duration-200 border',
                isActive
                  ? 'bg-bolman-purple border-bolman-purple text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-bolman-surfaceDark dark:border-bolman-borderDark dark:text-slate-300 dark:hover:bg-white/10',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
