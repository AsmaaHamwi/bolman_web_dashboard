import { useI18n } from '../../hooks/useI18n';
import type { SeatStatusRow } from '../../types/domain';
import { cx } from '../../utils/format';

export function SeatMap({
  seats,
  selected,
  onToggle,
  readonly = false,
}: {
  seats: SeatStatusRow[];
  selected: string[];
  onToggle?: (id: string) => void;
  readonly?: boolean;
}) {
  const { messages } = useI18n();

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark">
      <div className="mx-auto mb-5 w-40 rounded-b-3xl bg-slate-300 py-2 text-center text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
        {messages.seatMap.driver}
      </div>
      <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
        {seats.map((seat, idx) => {
          const aisle = idx % 4 === 1;
          const isSelected = selected.includes(seat.bus_seat_id);

          return (
            <button
              key={seat.bus_seat_id}
              disabled={readonly || seat.status !== 'available'}
              onClick={() => onToggle?.(seat.bus_seat_id)}
              className={cx(
                'h-11 rounded-2xl text-xs font-black transition',
                aisle && 'col-start-2',
                isSelected ? 'bg-bolman-purple text-white shadow-glow' : statusClass(seat.status),
              )}
            >
              {seat.seat_number}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
        <Legend color="bg-emerald-100" label={messages.status.available} />
        <Legend color="bg-bolman-purple" label={messages.seatMap.selected} />
        <Legend color="bg-red-100" label={messages.status.reserved} />
        <Legend color="bg-amber-100" label={messages.status.locked} />
        <Legend color="bg-slate-300" label={messages.status.inactive} />
      </div>
    </div>
  );
}

function statusClass(status: SeatStatusRow['status']) {
  if (status === 'available') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300';
  if (status === 'reserved') return 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300';
  if (status === 'locked') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
  return 'bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded ${color}`} />
      {label}
    </span>
  );
}
