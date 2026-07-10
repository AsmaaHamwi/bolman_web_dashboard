import { Star } from 'lucide-react';

type StarRatingProps = {
  value?: number | null;
  max?: number;
  emptyLabel?: string;
};

export function StarRating({ value, max = 5, emptyLabel = '—' }: StarRatingProps) {
  if (value == null) {
    return <span className="text-slate-400 dark:text-slate-500">{emptyLabel}</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5" title={`${value}/${max}`} aria-label={`${value} of ${max} stars`}>
      {Array.from({ length: max }, (_, index) => (
        <Star
          key={index}
          size={14}
          className={index < value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
          aria-hidden
        />
      ))}
    </span>
  );
}
