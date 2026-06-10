import { useI18n } from '../../hooks/useI18n';
import { cx } from '../../utils/format';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function buildPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const windowSize = 5;
  const items: Array<number | 'ellipsis'> = [1];
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    start = 2;
    end = windowSize;
  } else if (currentPage >= totalPages - 2) {
    start = totalPages - windowSize + 1;
    end = totalPages - 1;
  }

  if (start > 2) items.push('ellipsis');
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) items.push(pageNumber);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);

  return items;
}

export function Pagination({ page, totalPages, onPageChange, disabled = false }: PaginationProps) {
  const { messages } = useI18n();
  const items = buildPageItems(page, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        {messages.common.pageSummary
          .replace('{page}', String(page))
          .replace('{total}', String(totalPages))}
      </p>

      <nav
        className="flex flex-wrap items-center justify-center gap-2"
        aria-label={messages.common.paginationLabel}
      >
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-10 min-w-8 items-center justify-center px-1 text-sm text-slate-400"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={disabled}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cx(
                'inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-semibold transition',
                item === page
                  ? 'bg-bolman-purple text-white shadow-glow'
                  : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:text-white dark:hover:bg-bolman-surfaceDark',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              {item}
            </button>
          ),
        )}
      </nav>
    </div>
  );
}
