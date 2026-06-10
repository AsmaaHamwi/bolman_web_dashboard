import { HTMLAttributes } from 'react';
import { cx } from '../../utils/format';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-bolman-borderDark dark:bg-bolman-cardDark', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cx('text-lg font-bold text-slate-900 dark:text-white', className)} {...props} />;
}
