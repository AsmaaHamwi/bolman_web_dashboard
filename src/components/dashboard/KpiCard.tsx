import { LucideIcon, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { cx } from '../../utils/format';

export function KpiCard({ title, value, icon: Icon, hint, onClick, className, isLoading }: { title: string; value: string | number | React.ReactNode; icon: LucideIcon; hint?: string; onClick?: () => void; className?: string; isLoading?: boolean }) {
  return (
    <Card 
      className={cx("card-gradient overflow-hidden w-full", onClick && "cursor-pointer hover:shadow-lg transition-shadow", className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate">{title}</p>
          <div
            className="mt-2 font-black text-slate-950 dark:text-white truncate text-xl sm:text-2xl flex items-center min-h-[32px]"
            title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-bolman-purple" /> : value}
          </div>
          {hint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">{hint}</p>}
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bolman-purple text-white shadow-glow">
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}
