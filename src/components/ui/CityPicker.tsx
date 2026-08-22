import { useMemo, useState } from 'react';
import { ChevronDown, MapPin, Search } from 'lucide-react';
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
            ? 'rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-xs hover:border-bolman-purple/50 hover:shadow-sm dark:border-bolman-borderDark dark:bg-bolman-cardDark dark:hover:border-bolman-purple/50'
            : 'rounded-2xl border border-slate-200 bg-white hover:border-bolman-purple/40 dark:border-bolman-borderDark dark:bg-bolman-surfaceDark',
          !route && (compact ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-sm'),
          className,
        )}
      >
        {displayName ? (
          <>
            <CityThumbnail cityName={displayName} size={route ? 30 : (compact ? 28 : 32)} selected />
            <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900 dark:text-white">{displayName}</span>
          </>
        ) : (
          <>
            {route ? (
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-300">
                <MapPin size={15} />
              </div>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-400">{placeholder ?? messages.common.choose}</span>
          </>
        )}
        <ChevronDown size={17} className="shrink-0 text-slate-400 transition group-hover:text-bolman-purple" />
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
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                className="ps-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={messages.common.search}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={clear}
              className={cx(
                'shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                !value
                  ? 'border-bolman-purple bg-bolman-purple text-white'
                  : 'border-slate-200 text-slate-500 hover:border-bolman-purple/40 hover:bg-slate-50 dark:border-bolman-borderDark dark:text-slate-400 dark:hover:bg-white/5',
              )}
            >
              الكل
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {filtered.length === 0 ? (
              <div className="col-span-3 py-6 text-center text-sm text-slate-500">{messages.common.noData}</div>
            ) : (
              filtered.map((city) => {
                const isSelected = city.id === value;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => pick(city)}
                    className={cx(
                      'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition',
                      isSelected
                        ? 'border-bolman-purple bg-bolman-purple/8 text-bolman-purple'
                        : 'border-slate-200 text-slate-700 hover:border-bolman-purple/40 hover:bg-slate-50 dark:border-bolman-borderDark dark:text-slate-200 dark:hover:bg-white/5',
                    )}
                  >
                    <CityThumbnail cityName={city.name} size={36} selected={isSelected} />
                    <span className="w-full truncate text-center">{city.name}</span>
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
