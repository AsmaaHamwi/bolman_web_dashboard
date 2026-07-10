import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCheck, WalletCards, X } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Field, Input } from '../ui/Input';
import { useI18n } from '../../hooks/useI18n';
import {
  searchPassengersForWallet,
  type WalletPassengerSearchResult,
} from '../../services/wallet.service';
import { cx, formatMoney } from '../../utils/format';

type PassengerBookerPickerProps = {
  selected: WalletPassengerSearchResult | null;
  onSelect: (passenger: WalletPassengerSearchResult | null) => void;
  required?: boolean;
  showBalance?: boolean;
};

export function PassengerBookerPicker({
  selected,
  onSelect,
  required = false,
  showBalance = true,
}: PassengerBookerPickerProps) {
  const { messages } = useI18n();
  const copy = messages.company.manualBooking;
  const [search, setSearch] = useState('');

  const passengersQuery = useQuery({
    queryKey: ['wallet', 'passengers', 'picker', search.trim()],
    queryFn: () => searchPassengersForWallet(search, { limit: 20, offset: 0 }),
    enabled: !selected,
  });

  const results = useMemo(
    () => (passengersQuery.data ?? []) as WalletPassengerSearchResult[],
    [passengersQuery.data],
  );

  const filteredResults = useMemo(
    () => results.filter((row) => row.user_id !== selected?.user_id),
    [results, selected?.user_id],
  );

  return (
    <div className="space-y-3">
      {selected ? (
        <div className="rounded-2xl border border-bolman-purple/20 bg-bolman-purple/5 p-4 dark:border-bolman-purple/30 dark:bg-bolman-purple/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-bolman-purple/15 text-bolman-purple">
                <UserCheck size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-bolman-purple">{copy.selectedBooker}</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{selected.full_name}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {[selected.phone, selected.email].filter(Boolean).join(' · ')}
                </p>
                {showBalance ? (
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <WalletCards size={16} className="text-bolman-purple" />
                    {copy.walletBalance}: {formatMoney(selected.balance)}
                  </div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-bolman-surfaceDark dark:hover:text-white"
              onClick={() => {
                onSelect(null);
                setSearch('');
              }}
              aria-label={copy.clearBooker}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <Field label={copy.bookerSearchLabel}>
            <div className="relative">
              <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                className="ps-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.bookerSearchPlaceholder}
              />
            </div>
          </Field>
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.bookerSearchHint}</p>
          {passengersQuery.isPending ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{messages.common.loading}</p>
          ) : passengersQuery.isError ? (
            <p className="text-sm text-red-600 dark:text-red-300">{(passengersQuery.error as Error).message}</p>
          ) : filteredResults.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.bookerNoResults}</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {filteredResults.map((passenger) => (
                <li key={passenger.user_id}>
                  <button
                    type="button"
                    className={cx(
                      'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start transition',
                      'border-slate-200 bg-white hover:border-bolman-purple/30 hover:bg-bolman-purple/5',
                      'dark:border-bolman-borderDark dark:bg-bolman-surfaceDark dark:hover:border-bolman-purple/40',
                    )}
                    onClick={() => onSelect(passenger)}
                  >
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{passenger.full_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {[passenger.phone, passenger.email].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {showBalance ? (
                      <Badge tone="purple">{formatMoney(passenger.balance)}</Badge>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {required && !selected ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">{copy.bookerRequired}</p>
      ) : null}
    </div>
  );
}
