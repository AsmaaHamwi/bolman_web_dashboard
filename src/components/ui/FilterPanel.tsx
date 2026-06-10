import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Filter, Loader2, X } from 'lucide-react';
import { Button } from './Button';
import { cx } from '../../utils/format';

type FilterPanelProps = {
  title: string;
  clearLabel: string;
  showFiltersLabel: string;
  hideFiltersLabel: string;
  loading?: boolean;
  showReset: boolean;
  onReset: () => void;
  search: ReactNode;
  children: ReactNode;
  activeCount?: number;
};

export function FilterPanel({
  title,
  clearLabel,
  showFiltersLabel,
  hideFiltersLabel,
  loading = false,
  showReset,
  onReset,
  search,
  children,
  activeCount = 0,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (activeCount > 0) setExpanded(true);
  }, [activeCount]);

  return (
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft dark:border-bolman-borderDark dark:bg-bolman-cardDark">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {loading ? (
            <Loader2 size={16} className="shrink-0 animate-spin text-bolman-purple" aria-hidden />
          ) : (
            <Filter size={16} className="shrink-0 text-bolman-purple" aria-hidden />
          )}
          <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 sm:inline">{title}</span>
          <div className="min-w-0 flex-1">{search}</div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="shrink-0 px-3 py-2 text-xs"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? hideFiltersLabel : showFiltersLabel}
          {activeCount > 0 ? (
            <span className="rounded-full bg-bolman-purple px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown size={14} className={cx('transition', expanded && 'rotate-180')} aria-hidden />
        </Button>

        {showReset ? (
          <Button type="button" variant="ghost" className="shrink-0 px-3 py-2 text-xs" onClick={onReset}>
            <X size={14} />
            {clearLabel}
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2 dark:border-bolman-borderDark">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function CompactFilterControl({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('flex min-w-[9.5rem] flex-1 flex-col gap-1', className)}>
      <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const compactFilterInputClass =
  'rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-bolman-purple/10';
