import { cx } from '../../utils/format';

interface DateTimePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const strValue = value || '';
  const [datePart = '', rawTime = ''] = strValue.split('T');
  const timePart = rawTime ? rawTime.slice(0, 5) : '';

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate) {
      onChange('');
      return;
    }
    const t = timePart || '00:00';
    onChange(`${newDate}T${t}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const d = datePart || new Date().toISOString().slice(0, 10);
    onChange(`${d}T${newTime || '00:00'}`);
  };

  return (
    <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}>
      <input
        type="date"
        value={datePart}
        onChange={handleDateChange}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-bolman-purple focus:ring-4 focus:ring-bolman-purple/10 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-white disabled:opacity-50"
      />
      <input
        type="time"
        value={timePart}
        onChange={handleTimeChange}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-bolman-purple focus:ring-4 focus:ring-bolman-purple/10 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-white disabled:opacity-50"
      />
    </div>
  );
}
