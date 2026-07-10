import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm bolman-fade-up">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-bolman-modal-in dark:border-bolman-borderDark dark:bg-bolman-cardDark">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <Button variant="ghost" onClick={onClose} className="p-2"><X size={18} /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}
