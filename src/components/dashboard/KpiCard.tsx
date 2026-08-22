import { LucideIcon, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { cx } from '../../utils/format';

export function KpiCard({ title, value, icon: Icon, hint, onClick, className, isLoading }: { title: string; value: string | number | React.ReactNode; icon: LucideIcon; hint?: string; onClick?: () => void; className?: string; isLoading?: boolean }) {
  return (
    <Card 
      className={cx("card-gradient overflow-hidden w-full p-4 sm:p-4 rounded-2xl", onClick && "cursor-pointer hover:shadow-lg transition-shadow", className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2.5 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{title}</p>
          <div
            className="mt-1 font-black text-slate-950 dark:text-white truncate text-lg sm:text-xl flex items-center min-h-[28px]"
            title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-bolman-purple" /> : value}
          </div>
          {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">{hint}</p>}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bolman-purple text-white shadow-glow">
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}
