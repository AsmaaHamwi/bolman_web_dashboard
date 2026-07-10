import { cx } from '../../utils/format';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

type AnimatedSegmentBarProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function AnimatedSegmentBar<T extends string>({
  options,
  value,
  onChange,
  className,
}: AnimatedSegmentBarProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const width = 100 / options.length;

  return (
    <div
      className={cx(
        'relative grid rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        className="pointer-events-none absolute inset-y-1 rounded-full bg-gradient-to-br from-bolman-purple to-bolman-deep shadow-soft transition-all duration-300 ease-out"
        style={{
          width: `calc(${width}% - 4px)`,
          insetInlineStart: `calc(${width * index}% + 2px)`,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cx(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-bold transition-colors duration-200',
              active ? 'text-white' : 'text-slate-600 dark:text-slate-300',
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
