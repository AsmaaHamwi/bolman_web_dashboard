import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

export function KpiCard({ title, value, icon: Icon, hint }: { title: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <Card className="card-gradient">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</p>
          <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</div>
          {hint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-bolman-purple text-white shadow-glow"><Icon size={22}/></div>
      </div>
    </Card>
  );
}
