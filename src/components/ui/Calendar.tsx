import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx, getLocalDateInputValue } from '../../utils/format';
import { getIntlLocale, type Locale } from '../../i18n';

interface CalendarProps {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  minDate?: string; // "YYYY-MM-DD"
  locale: Locale;
  isArabic: boolean;
}

export function Calendar({
  value,
  onChange,
  minDate,
  locale,
  isArabic,
}: CalendarProps) {
  const intlLocale = getIntlLocale(locale);

  // Extract initial year and month from value
  const initialDate = value ? new Date(`${value}T12:00:00`) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

  // Keep year/month in sync if value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T12:00:00`);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  }, [value]);

  const todayStr = getLocalDateInputValue(new Date());

  // Weekdays header (Sunday to Saturday)
  const weekdays = [];
  for (let i = 0; i < 7; i++) {
    // 2026-08-09 is a Sunday
    const d = new Date(2026, 7, 9 + i);
    weekdays.push(
      new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(d)
    );
  }

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Sunday is 0
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: Array<{
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isDisabled: boolean;
  }> = [];

  // Previous month padding days
  for (let i = 0; i < firstDayIndex; i++) {
    const prevDayNum = daysInPrevMonth - firstDayIndex + 1 + i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYearNum = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYearNum}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`;
    
    calendarDays.push({
      dateStr,
      dayNum: prevDayNum,
      isCurrentMonth: false,
      isDisabled: !!minDate && dateStr < minDate,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    calendarDays.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: true,
      isDisabled: !!minDate && dateStr < minDate,
    });
  }

  // Next month padding days to fill 42 cells (6 rows * 7 columns)
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYearNum = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYearNum}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    calendarDays.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: false,
      isDisabled: !!minDate && dateStr < minDate,
    });
  }

  // Current month name
  const monthName = new Intl.DateTimeFormat(intlLocale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(currentYear, currentMonth, 1));

  // Quick select
  const handleQuickSelect = (type: 'today' | 'tomorrow') => {
    const target = new Date();
    if (type === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    }
    const val = getLocalDateInputValue(target);
    onChange(val);
  };

  return (
    <div className="w-[280px] p-3 text-slate-800 dark:text-slate-200" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-bolman-borderDark">
        <button
          type="button"
          onClick={isArabic ? nextMonth : prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition hover:border-bolman-purple/40 hover:bg-bolman-purple/5 hover:text-bolman-purple dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-300"
          aria-label={isArabic ? 'الشهر التالي' : 'Previous month'}
        >
          {isArabic ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <span className="text-sm font-black select-none text-slate-900 dark:text-white">
          {monthName}
        </span>
        <button
          type="button"
          onClick={isArabic ? prevMonth : nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition hover:border-bolman-purple/40 hover:bg-bolman-purple/5 hover:text-bolman-purple dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-slate-300"
          aria-label={isArabic ? 'الشهر السابق' : 'Next month'}
        >
          {isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Weekdays Grid */}
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400 dark:text-slate-500">
        {weekdays.map((day, idx) => (
          <div key={idx} className="h-6 flex items-center justify-center select-none">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {calendarDays.map((dayCell, idx) => {
          const isSelected = dayCell.dateStr === value;
          const isToday = dayCell.dateStr === todayStr;

          return (
            <button
              key={idx}
              type="button"
              disabled={dayCell.isDisabled}
              onClick={() => onChange(dayCell.dateStr)}
              className={cx(
                'h-8 w-8 rounded-xl text-xs font-black transition-all flex items-center justify-center relative',
                // Disabled state
                dayCell.isDisabled
                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed bg-transparent'
                  : cx(
                      // Active state
                      dayCell.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600',
                      // Selection state
                      isSelected
                        ? 'bg-bolman-purple text-white shadow-sm shadow-bolman-purple/30 font-black'
                        : 'hover:bg-slate-100 dark:hover:bg-bolman-surfaceDark'
                    )
              )}
            >
              <span>{dayCell.dayNum}</span>
              {/* Today indicator dot */}
              {isToday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-bolman-purple" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Select Actions */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-bolman-borderDark flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => handleQuickSelect('today')}
          className="flex-1 py-1.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-700 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark/30 dark:hover:bg-bolman-surfaceDark dark:text-slate-300 font-extrabold transition"
        >
          {isArabic ? 'اليوم' : 'Today'}
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect('tomorrow')}
          className="flex-1 py-1.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-700 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark/30 dark:hover:bg-bolman-surfaceDark dark:text-slate-300 font-extrabold transition"
        >
          {isArabic ? 'غداً' : 'Tomorrow'}
        </button>
      </div>
    </div>
  );
}
