import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cx } from '../../utils/format';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-bolman-purple focus:ring-4 focus:ring-bolman-purple/10 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:text-white';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cx(inputClass, className)} {...props} />;
});

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Accessible label for the reveal button while the password is hidden. */
  showLabel?: string;
  /** Accessible label for the reveal button while the password is visible. */
  hideLabel?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, showLabel = 'Show password', hideLabel = 'Hide password', ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? hideLabel : showLabel;
  return (
    <div className="relative">
      <input ref={ref} type={visible ? 'text' : 'password'} className={cx(inputClass, 'pe-12', className)} {...props} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((state) => !state)}
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
        className="absolute end-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-bolman-purple dark:hover:bg-white/10 dark:hover:text-white"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, 'min-h-28', className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200"><span>{label}</span>{children}</label>;
}
