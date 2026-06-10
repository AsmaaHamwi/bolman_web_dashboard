import { ButtonHTMLAttributes } from 'react';
import { cx } from '../../utils/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'mint';

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<Variant, string> = {
    primary: 'bg-bolman-purple text-white shadow-glow hover:bg-bolman-deep',
    secondary: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 dark:bg-bolman-cardDark dark:text-white dark:border-bolman-borderDark dark:hover:bg-bolman-surfaceDark',
    ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-bolman-surfaceDark',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    mint: 'bg-bolman-mint text-slate-900 hover:bg-emerald-300'
  };
  return <button className={cx(base, variants[variant], className)} {...props} />;
}
