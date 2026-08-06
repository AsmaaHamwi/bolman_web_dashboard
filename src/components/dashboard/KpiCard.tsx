import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

export function KpiCard({ title, value, icon: Icon, hint }: { title: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <Card className="card-gradient overflow-hidden w-full">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate">{title}</p>
          <div
            className="mt-2 font-black text-slate-950 dark:text-white truncate text-xl sm:text-2xl"
            title={String(value)}
          >
            {value}
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
