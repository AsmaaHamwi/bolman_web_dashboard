import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, MapPin, Search } from 'lucide-react';
import { CityThumbnail } from './CityThumbnail';
import { Input } from './Input';
import { Modal } from './Modal';
import { cx } from '../../utils/format';
import { useI18n } from '../../hooks/useI18n';

export type CityOption = { id: string; name: string };

type CityPickerProps = {
  cities: CityOption[];
  value: string;
  onChange: (cityId: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  route?: boolean;
  selectedName?: string;
};

export function CityPicker({
  cities,
  value,
  onChange,
  placeholder,
  className,
  compact = false,
  route = false,
  selectedName,
}: CityPickerProps) {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = cities.find((c) => c.id === value);
  const displayName = selected?.name ?? selectedName;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, query]);

  function pick(city: CityOption) {
    onChange(city.id);
    setOpen(false);
    setQuery('');
  }

  function clear() {
    onChange('');
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          'flex w-full items-center gap-2 text-start outline-none transition focus:border-bolman-purple focus:ring-4 focus:ring-bolman-purple/10',
          route
            ? 'rounded-xl border border-slate-200/80 bg-slate-100/70 px-3 py-2.5 hover:border-bolman-purple/30 dark:border-bolman-borderDark dark:bg-white/5 dark:hover:border-bolman-purple/40'
            : 'rounded-2xl border border-slate-200 bg-white hover:border-bolman-purple/40 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark',
          !route && (compact ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-sm'),
          className,
        )}
      >
        {displayName ? (
          <>
            <CityThumbnail cityName={displayName} size={route || compact ? 28 : 32} selected />
            <span className="min-w-0 flex-1 truncate font-bold text-slate-900 dark:text-white">{displayName}</span>
          </>
        ) : (
          <>
            {route ? <MapPin size={17} className="shrink-0 text-slate-400" /> : null}
            <span className="min-w-0 flex-1 truncate text-slate-400">{placeholder ?? messages.common.choose}</span>
          </>
        )}
        <ChevronDown size={18} className="shrink-0 text-slate-400" />
      </button>

      <Modal
        open={open}
        title={messages.company.trips.chooseCity}
        onClose={() => {
          setOpen(false);
          setQuery('');
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              className="ps-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={messages.common.search}
              autoFocus
            />
          </div>

          <div className="max-h-[min(52vh,360px)] overflow-y-auto rounded-2xl border border-slate-200 dark:border-bolman-borderDark">
            <button
              type="button"
              onClick={clear}
              className="flex w-full items-center gap-3 border-b border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-bolman-borderDark dark:hover:bg-white/5"
            >
              {messages.common.choose}
            </button>
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">{messages.common.noData}</div>
            ) : (
              filtered.map((city) => {
                const isSelected = city.id === value;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => pick(city)}
                    className={cx(
                      'flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-start transition last:border-b-0 dark:border-bolman-borderDark',
                      isSelected ? 'bg-bolman-purple/8' : 'hover:bg-slate-50 dark:hover:bg-white/5',
                    )}
                  >
                    <CityThumbnail cityName={city.name} size={34} selected={isSelected} />
                    <span
                      className={cx(
                        'min-w-0 flex-1 truncate text-sm',
                        isSelected ? 'font-extrabold text-bolman-purple' : 'font-semibold text-slate-800 dark:text-slate-100',
                      )}
                    >
                      {city.name}
                    </span>
                    {isSelected ? <CheckCircle2 size={18} className="shrink-0 text-bolman-purple" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
