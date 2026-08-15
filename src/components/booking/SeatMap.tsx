import { useI18n } from '../../hooks/useI18n';
import { cx } from '../../utils/format';

export interface SeatItemInput {
  id?: string;
  bus_seat_id?: string;
  seat_number: number;
  is_active?: boolean;
  status?: 'available' | 'reserved' | 'locked' | 'inactive';
}

export function SeatMap({
  seats,
  selected = [],
  onToggle,
  readonly = false,
  layoutType = '2_2',
  loading = false,
}: {
  seats: any[];
  selected?: string[];
  onToggle?: (id: string) => void;
  readonly?: boolean;
  layoutType?: '2_2' | '2_1';
  loading?: boolean;
}) {
  const { messages } = useI18n();

  const sortedSeats = [...seats].sort((a, b) => a.seat_number - b.seat_number);
  const seatsPerRow = layoutType === '2_1' ? 3 : 4;
  const leftCount = 2;
  const rightCount = seatsPerRow - leftCount;

  const rows: { left: any[]; right: any[] }[] = [];
  for (let i = 0; i < sortedSeats.length; i += seatsPerRow) {
    const chunk = sortedSeats.slice(i, i + seatsPerRow);
    rows.push({
      left: chunk.slice(0, leftCount),
      right: chunk.slice(leftCount, leftCount + rightCount),
    });
  }

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[2.5rem] border-4 border-slate-300/80 bg-slate-100/90 p-4 sm:p-5 shadow-xl dark:border-slate-700/80 dark:bg-bolman-surfaceDark">
      {/* Front Windshield & Driver Area */}
      <div className="mb-5 flex items-center justify-between rounded-t-3xl border-b-2 border-dashed border-slate-300/80 pb-3 dark:border-slate-700/80">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-200/90 px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-inner">
          <span className="text-base">🚘</span>
          <span>{messages.seatMap.driver}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{messages.seatMap.entrance}</span>
        </div>
      </div>

      {/* Seat Rows Grid / Loading Skeletons */}
      {loading ? (
        <div className="space-y-3.5 px-1 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((rowNum) => (
            <div key={rowNum} className="flex items-center justify-center gap-2 sm:gap-2.5">
              <span className="w-4 text-center text-xs font-bold text-slate-300 shrink-0">
                {rowNum}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="w-6 sm:w-8 flex items-center justify-center shrink-0">
                <span className="text-[10px] text-slate-300">•</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p className="font-bold">جاري تحميل خريطة المقاعد...</p>
        </div>
      ) : (
        <div className="space-y-3 px-0.5">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center justify-center gap-1.5 sm:gap-2.5">
              {/* Row Number */}
              <span className="w-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">
                {rIdx + 1}
              </span>

              {/* Left Pair */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {row.left.map((seat) => (
                  <SeatButton
                    key={seat.bus_seat_id || seat.id || seat.seat_number}
                    seat={seat}
                    selected={selected}
                    readonly={readonly}
                    onToggle={onToggle}
                  />
                ))}
              </div>

              {/* Central Aisle */}
              <div className="w-5 sm:w-7 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black tracking-widest text-slate-400/60 dark:text-slate-600 uppercase select-none">
                  {rIdx === 0 ? messages.seatMap.aisle : '•'}
                </span>
              </div>

              {/* Right Pair */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {row.right.map((seat) => (
                  <SeatButton
                    key={seat.bus_seat_id || seat.id || seat.seat_number}
                    seat={seat}
                    selected={selected}
                    readonly={readonly}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rear Wall / Back of the Bus */}
      <div className="mt-6 flex items-center justify-center gap-2 rounded-b-3xl border-t-2 border-dashed border-slate-300/80 pt-3 text-xs font-black text-slate-500 dark:border-slate-700/80 dark:text-slate-400">
        <span className="text-base">🚍</span>
        <span>{messages.seatMap.rear}</span>
      </div>

      {/* Status Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-2.5 border-t border-slate-200/80 pt-3 text-xs dark:border-slate-700/60">
        <Legend color="bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400" label={messages.status.available} />
        <Legend color="bg-bolman-purple" label={messages.seatMap.selected} />
        <Legend color="bg-red-100 dark:bg-red-500/20 border-red-400" label={messages.status.reserved} />
        <Legend color="bg-amber-100 dark:bg-amber-500/20 border-amber-400" label={messages.status.locked} />
        <Legend color="bg-slate-300 dark:bg-slate-700 border-slate-400" label={messages.status.inactive} />
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  selected,
  readonly,
  onToggle,
}: {
  seat: any;
  selected: string[];
  readonly?: boolean;
  onToggle?: (id: string) => void;
}) {
  const seatId = seat.bus_seat_id || seat.id || String(seat.seat_number);
  const status = seat.status ?? (seat.is_active === false ? 'inactive' : 'available');
  const isSelected = selected.includes(seatId);
  const isDisabled = readonly || status !== 'available';

  return (
    <div className="group flex flex-col items-center">
      {/* Curved Headrest */}
      <div
        className={cx(
          'h-2 w-7 sm:w-8 rounded-t-md transition-colors',
          isSelected ? 'bg-bolman-purple' : headrestClass(status),
        )}
      />

      {/* Main Seat Body with Armrests */}
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onToggle?.(seatId)}
        className={cx(
          'relative flex h-11 w-11 sm:h-12 sm:w-12 flex-col items-center justify-center rounded-2xl border text-xs font-black transition-all shadow-sm',
          isSelected
            ? 'bg-bolman-purple text-white border-bolman-purple shadow-glow ring-2 ring-bolman-purple/50 scale-105'
            : statusClass(status),
          !isDisabled && !isSelected && 'hover:scale-105 hover:shadow-md cursor-pointer',
        )}
      >
        {/* Left Armrest */}
        <span className="absolute -left-0.5 top-2 bottom-2 w-0.5 rounded-l-md bg-current opacity-25" />
        {/* Right Armrest */}
        <span className="absolute -right-0.5 top-2 bottom-2 w-0.5 rounded-r-md bg-current opacity-25" />

        <span>#{seat.seat_number}</span>
      </button>
    </div>
  );
}

function headrestClass(status: string) {
  if (status === 'available') return 'bg-emerald-400 dark:bg-emerald-500/50';
  if (status === 'reserved') return 'bg-red-400 dark:bg-red-500/50';
  if (status === 'locked') return 'bg-amber-400 dark:bg-amber-500/50';
  return 'bg-slate-400 dark:bg-slate-600';
}

function statusClass(status: string) {
  if (status === 'available')
    return 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
  if (status === 'reserved')
    return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30 cursor-not-allowed';
  if (status === 'locked')
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 cursor-not-allowed';
  return 'bg-slate-200 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed';
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
      <span className={`h-3 w-3 rounded-md border ${color}`} />
      {label}
    </span>
  );
}
