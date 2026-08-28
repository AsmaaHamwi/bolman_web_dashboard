import { cx } from '../../utils/format';
import { DateInput } from './DateInput';
import { TimeInput } from './TimeInput';

interface DateTimePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** Lower bound as a "YYYY-MM-DDTHH:mm" datetime string. */
  min?: string | null;
  /** Upper bound as a "YYYY-MM-DDTHH:mm" datetime string. */
  max?: string | null;
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  className,
  min,
  max,
}: DateTimePickerProps) {
  const strValue = value || '';
  const [datePart = '', rawTime = ''] = strValue.split('T');
  const timePart = rawTime ? rawTime.slice(0, 5) : '';

  const [minDate = '', minTime = ''] = (min || '').split('T');
  const [maxDate = '', maxTime = ''] = (max || '').split('T');

  const timeMin = minDate && datePart === minDate ? minTime : undefined;
  const timeMax = maxDate && datePart === maxDate ? maxTime : undefined;

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const t = timePart || '00:00';
    onChange(`${newDate}T${t}`);
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) {
      onChange(datePart ? `${datePart}T00:00` : '');
      return;
    }
    const d = datePart || minDate || new Date().toISOString().slice(0, 10);
    onChange(`${d}T${newTime}`);
  };

  return (
    <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}>
      <DateInput
        value={datePart}
        onChange={handleDateChange}
        min={minDate || undefined}
        max={maxDate || undefined}
        disabled={disabled}
        className="px-3 py-2.5"
      />
      <TimeInput
        value={timePart}
        onChange={handleTimeChange}
        min={timeMin}
        max={timeMax}
        disabled={disabled}
        className="px-3 py-2.5"
      />
    </div>
  );
}
