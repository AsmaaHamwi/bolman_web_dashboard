import { ReactNode } from 'react';
import { useI18n } from '../../hooks/useI18n';

type DataTableProps = {
  columns: string[];
  children: ReactNode;
  empty?: boolean;
  loading?: boolean;
  loadingRows?: number;
};

export function DataTable({ columns, children, empty, loading = false, loadingRows = 4 }: DataTableProps) {
  const { messages } = useI18n();

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-bolman-borderDark dark:bg-bolman-cardDark">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-bolman-borderDark" aria-busy={loading}>
          <thead className="bg-slate-50 dark:bg-bolman-surfaceDark">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 text-start font-bold text-slate-600 dark:text-slate-300">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-bolman-borderDark">
            {loading
              ? Array.from({ length: loadingRows }, (_, index) => (
                  <tr key={`loading-${index}`} className="animate-pulse">
                    <td colSpan={columns.length} className="px-4 py-3">
                      <div className="h-4 rounded-full bg-slate-100 dark:bg-bolman-surfaceDark" />
                    </td>
                  </tr>
                ))
              : children}
          </tbody>
        </table>
        {!loading ? (
          empty ? <div className="p-8 text-center text-slate-500 dark:text-slate-400">{messages.common.noData}</div> : null
        ) : null}
      </div>
    </div>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>;
}
