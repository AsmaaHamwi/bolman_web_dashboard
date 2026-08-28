import { useEffect, useState } from "react";
import { cx } from "../../utils/format";

type TimeInputProps = {
  value: string; // HH:mm
  onChange: (value: string) => void; // yields HH:mm or ""
  className?: string;
  min?: string; // HH:mm
  max?: string; // HH:mm
  disabled?: boolean;
};

function parseParts(value: string): { hour: string; minute: string } {
  if (!value) return { hour: "", minute: "" };
  const [h = "", m = ""] = value.split(":");
  return { hour: h, minute: m };
}

function buildValue(hour: string, minute: string): string {
  if (!hour || !minute) return "";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

const selectClass =
  "min-w-0 flex-1 h-full rounded-xl border-0 bg-transparent text-xs outline-none cursor-pointer focus:ring-0 text-slate-700 dark:text-white px-0.5 truncate";

const optionClass = "text-slate-900 bg-white dark:bg-bolman-surfaceDark dark:text-white";

export function TimeInput({ value, onChange, className, min, max, disabled = false }: TimeInputProps) {
  const [parts, setParts] = useState(() => parseParts(value));

  useEffect(() => {
    setParts(parseParts(value));
  }, [value]);

  const { hour, minute } = parts;
  const minParts = parseParts(min ?? "");
  const maxParts = parseParts(max ?? "");
  const hourFrom = minParts.hour ? Number(minParts.hour) : 0;
  const hourTo = maxParts.hour ? Number(maxParts.hour) : 23;
  const hourOptions = Array.from({ length: Math.max(0, hourTo - hourFrom) + 1 }, (_, i) => hourFrom + i);

  const minuteFrom = minParts.hour && hour === minParts.hour && minParts.minute ? Number(minParts.minute) : 0;
  const minuteTo = maxParts.hour && hour === maxParts.hour && maxParts.minute ? Number(maxParts.minute) : 59;
  const minuteOptions = Array.from({ length: Math.max(0, minuteTo - minuteFrom) + 1 }, (_, i) => minuteFrom + i);

  function update(field: "hour" | "minute", newVal: string) {
    const next = { ...parts, [field]: newVal };
    setParts(next);
    onChange(buildValue(next.hour, next.minute));
  }

  return (
    <div
      className={cx(
        "flex items-center gap-0.5 overflow-hidden min-w-0 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 transition focus-within:border-bolman-purple focus-within:ring-4 focus-within:ring-bolman-purple/10 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark",
        disabled && "opacity-50",
        className,
      )}
      dir="rtl"
    >
      {/* Hour */}
      <select value={hour} onChange={(e) => update("hour", e.target.value)} className={selectClass} aria-label="الساعة" disabled={disabled}>
        <option value="" className={optionClass}>ساعة</option>
        {hourOptions.map((h) => (
          <option key={h} value={String(h).padStart(2, "0")} className={optionClass}>{String(h).padStart(2, "0")}</option>
        ))}
      </select>

      <span className="text-slate-300 dark:text-slate-600 select-none">:</span>

      {/* Minute */}
      <select value={minute} onChange={(e) => update("minute", e.target.value)} className={selectClass} aria-label="الدقيقة" disabled={disabled}>
        <option value="" className={optionClass}>دقيقة</option>
        {minuteOptions.map((m) => (
          <option key={m} value={String(m).padStart(2, "0")} className={optionClass}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>

      {/* Clear button */}
      {value && !disabled ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="ms-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-xs leading-none"
          aria-label="مسح الوقت"
          tabIndex={-1}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
