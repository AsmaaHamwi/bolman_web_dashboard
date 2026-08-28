import { useEffect, useRef, useState } from "react";
import { cx } from "../../utils/format";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

type DateInputProps = {
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void; // yields yyyy-mm-dd or ""
  className?: string;
  min?: string; // yyyy-mm-dd
  max?: string; // yyyy-mm-dd
  /** How many past years the year dropdown should reach back. Defaults to 0 (future-facing pickers). */
  pastYears?: number;
  disabled?: boolean;
};

function parseParts(value: string): { year: string; month: string; day: string } {
  if (!value) return { year: "", month: "", day: "" };
  const [y = "", m = "", d = ""] = value.split("-");
  return { year: y, month: m, day: d };
}

function buildValue(year: string, month: string, day: string): string {
  if (!year || !month || !day) return "";
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const selectClass =
  "min-w-0 flex-1 h-full rounded-xl border-0 bg-transparent text-xs outline-none cursor-pointer focus:ring-0 text-slate-700 dark:text-white px-0.5 truncate";

const optionClass = "text-slate-900 bg-white dark:bg-bolman-surfaceDark dark:text-white";

export function DateInput({ value, onChange, className, min, max, pastYears = 0, disabled = false }: DateInputProps) {
  const [parts, setParts] = useState(() => parseParts(value));

  useEffect(() => {
    setParts(parseParts(value));
  }, [value]);

  const { year, month, day } = parts;
  const minParts = parseParts(min ?? "");
  const maxParts = parseParts(max ?? "");
  const currentYear = new Date().getFullYear();
  const yearFrom = Number(minParts.year) || currentYear - Math.max(0, pastYears);
  const yearTo = Number(maxParts.year) || currentYear + 3;
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: Math.max(0, yearTo - yearFrom) + 1 }, (_, i) => yearFrom + i);

  function update(field: "year" | "month" | "day", newVal: string) {
    const next = { ...parts, [field]: newVal };
    setParts(next);
    onChange(buildValue(next.year, next.month, next.day));
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
      {/* Day */}
      <select value={day} onChange={(e) => update("day", e.target.value)} className={selectClass} aria-label="اليوم" disabled={disabled}>
        <option value="" className={optionClass}>يوم</option>
        {dayOptions.map((d) => (
          <option key={d} value={String(d).padStart(2, "0")} className={optionClass}>{d}</option>
        ))}
      </select>

      <span className="text-slate-300 dark:text-slate-600 select-none">/</span>

      {/* Month */}
      <select value={month} onChange={(e) => update("month", e.target.value)} className={selectClass} aria-label="الشهر" disabled={disabled}>
        <option value="" className={optionClass}>شهر</option>
        {monthOptions.map((m) => (
          <option key={m} value={String(m).padStart(2, "0")} className={optionClass}>{MONTHS_AR[m - 1]}</option>
        ))}
      </select>

      <span className="text-slate-300 dark:text-slate-600 select-none">/</span>

      {/* Year */}
      <select value={year} onChange={(e) => update("year", e.target.value)} className={selectClass} aria-label="السنة" disabled={disabled}>
        <option value="" className={optionClass}>السنة</option>
        {yearOptions.map((y) => (
          <option key={y} value={String(y)} className={optionClass}>{y}</option>
        ))}
      </select>

      {/* Clear button */}
      {value && !disabled ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="ms-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-xs leading-none"
          aria-label="مسح التاريخ"
          tabIndex={-1}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
