import { cx } from '../../utils/format';

const toneMap = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  purple: 'bg-bolman-purple/10 text-bolman-deep dark:bg-bolman-purple/20 dark:text-violet-200',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-200',
  mint: 'bg-bolman-softMint text-emerald-700 dark:bg-bolman-mint/15 dark:text-bolman-mint',
};

export function Badge({ children, tone = 'slate', className }: { children: React.ReactNode; tone?: keyof typeof toneMap; className?: string }) {
  return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', toneMap[tone], className)}>{children}</span>;
}
