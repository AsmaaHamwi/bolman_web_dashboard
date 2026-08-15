import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, WalletCards } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { Field, Input, Select, Textarea } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { DataTable, Td } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { useCompanyStaffPermissions } from '../../../hooks/usePermissions';
import { useI18n } from '../../../hooks/useI18n';
import {
  getPassengerWalletSummary,
  getPassengerWalletTransactions,
  officeWalletTopup,
  officeWalletWithdraw,
  searchPassengersForWallet,
  walletPassengerPageSize,
  type WalletPassengerSearchResult,
} from '../../../services/wallet.service';
import { cx, formatDateTime, formatMoney } from '../../../utils/format';

type WalletAction = 'topup' | 'withdraw';
type FeedbackTone = 'success' | 'error';

const SOURCE_OPTIONS = [
  { value: 'office', label: 'المكتب (مكتبي)' },
  { value: 'mtn_cash', label: 'MTN Cash' },
  { value: 'syriatel_cash', label: 'Syriatel Cash' },
  { value: 'adjustment', label: 'تعديل / تسوية رصيد' },
  { value: 'booking', label: 'حجز' },
  { value: 'refund', label: 'استرداد' },
];

export function CompanyWalletsPage() {
  const { profile } = useAuth();
  const { messages } = useI18n();
  const queryClient = useQueryClient();
  const companyPermissions = useCompanyStaffPermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPassenger, setSelectedPassenger] = useState<WalletPassengerSearchResult | null>(null);
  const [action, setAction] = useState<WalletAction | null>(null);
  const [sourceType, setSourceType] = useState<string>('office');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);

  const canManageWallets =
    profile?.role === 'company_owner' ||
    !!companyPermissions.data?.can_manage_wallets ||
    !!companyPermissions.data?.can_manage_bookings;

  const passengersQuery = useQuery({
    queryKey: ['wallet', 'passengers', search.trim(), page],
    queryFn: () =>
      searchPassengersForWallet(search, {
        limit: walletPassengerPageSize,
        offset: (page - 1) * walletPassengerPageSize,
      }),
    enabled: canManageWallets,
  });

  const passengers = (passengersQuery.data ?? []) as WalletPassengerSearchResult[];

  const hasMore = passengers.length === walletPassengerPageSize;
  const totalPages = hasMore ? page + 1 : page;

  const summaryQuery = useQuery({
    queryKey: ['wallet', 'summary', selectedPassenger?.user_id],
    queryFn: () => getPassengerWalletSummary(selectedPassenger!.user_id),
    enabled: canManageWallets && !!selectedPassenger,
  });

  const transactionsQuery = useQuery({
    queryKey: ['wallet', 'transactions', selectedPassenger?.user_id],
    queryFn: () => getPassengerWalletTransactions(selectedPassenger!.user_id),
    enabled: canManageWallets && !!selectedPassenger,
  });

  const currentBalance = summaryQuery.data?.balance ?? selectedPassenger?.balance ?? 0;
  const parsedAmount = useMemo(() => Number(amount), [amount]);

  function resetAction() {
    setAction(null);
    setSourceType('office');
    setAmount('');
    setNotes('');
  }

  const topupMutation = useMutation({
    mutationFn: (formattedNotes?: string) => officeWalletTopup(selectedPassenger!.user_id, parsedAmount, formattedNotes ?? notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setFeedback({ tone: 'success', message: messages.company.wallets.topupSuccess });
      resetAction();
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (formattedNotes?: string) => officeWalletWithdraw(selectedPassenger!.user_id, parsedAmount, formattedNotes ?? notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setFeedback({ tone: 'success', message: messages.company.wallets.withdrawSuccess });
      resetAction();
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : messages.common.unexpectedError });
    },
  });

  function submitAction() {
    setFeedback(null);

    if (!selectedPassenger) return;
    if (!parsedAmount || parsedAmount <= 0) {
      setFeedback({ tone: 'error', message: messages.company.wallets.invalidAmount });
      return;
    }
    if (action === 'withdraw' && parsedAmount > currentBalance) {
      setFeedback({ tone: 'error', message: messages.company.wallets.insufficientBalance });
      return;
    }

    const selectedSourceLabel = SOURCE_OPTIONS.find((s) => s.value === sourceType)?.label || sourceType;
    const sourcePrefix = sourceType !== 'office' ? `[المصدر: ${selectedSourceLabel}]` : '';
    const fullNotes = [sourcePrefix, notes.trim()].filter(Boolean).join(' ');

    if (action === 'topup') topupMutation.mutate(fullNotes);
    if (action === 'withdraw') withdrawMutation.mutate(fullNotes);
  }

  if (profile?.role === 'company_staff' && companyPermissions.isPending) {
    return <div className="grid min-h-[40vh] place-items-center text-bolman-purple">{messages.common.loading}</div>;
  }

  if (!canManageWallets) {
    return (
      <Card>
        <CardTitle>{messages.company.wallets.title}</CardTitle>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.company.wallets.noPermission}</p>
      </Card>
    );
  }

  const rawTransactions = transactionsQuery.data ?? [];

  const transactions = useMemo(() => {
    if (!rawTransactions.length) return [];

    // Transactions from API are sorted newest first.
    // We compute balance_after backwards starting from the current actual wallet balance.
    let running = currentBalance;

    return rawTransactions.map((tx) => {
      if (tx.balance_after != null) {
        const explicit = Number(tx.balance_after);
        const isEffective = tx.status !== 'failed';
        const amt = isEffective ? Number(tx.amount || 0) : 0;
        running = tx.transaction_type === 'credit' ? explicit - amt : explicit + amt;
        return { ...tx, computed_balance_after: explicit };
      }

      const currentTxBalance = running;
      const isEffective = tx.status !== 'failed';
      const amt = isEffective ? Number(tx.amount || 0) : 0;
      running = tx.transaction_type === 'credit' ? running - amt : running + amt;

      return { ...tx, computed_balance_after: Math.max(0, currentTxBalance) };
    });
  }, [rawTransactions, currentBalance]);

  const submitting = topupMutation.isPending || withdrawMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title={messages.company.wallets.title} subtitle={messages.company.wallets.subtitle} />

      {feedback ? (
        <div
          className={cx(
            'rounded-2xl border px-4 py-3 text-sm font-medium',
            feedback.tone === 'success'
              ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      {!selectedPassenger ? (
        <Card>
          <CardTitle>{messages.company.wallets.searchTitle}</CardTitle>
          <div className="mt-4 space-y-4">
            <Field label={messages.company.wallets.searchLabel}>
              <div className="relative">
                <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  className="ps-11"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                    setFeedback(null);
                  }}
                  placeholder={messages.company.wallets.searchPlaceholder}
                />
              </div>
            </Field>

            <p className="text-sm text-slate-500 dark:text-slate-400">{messages.company.wallets.directoryHint}</p>
            {passengersQuery.isError ? (
              <p className="text-sm text-red-600 dark:text-red-300">{(passengersQuery.error as Error).message}</p>
            ) : null}

            <DataTable
              columns={messages.company.wallets.passengerTable as unknown as string[]}
              loading={passengersQuery.isPending}
              empty={!passengersQuery.isPending && passengers.length === 0}
            >
              {passengers.map((passenger) => (
                <tr
                  key={passenger.user_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedPassenger(passenger);
                    setFeedback(null);
                    resetAction();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedPassenger(passenger);
                      setFeedback(null);
                      resetAction();
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-bolman-surfaceDark/80"
                >
                  <Td className="whitespace-nowrap font-bold text-slate-900 dark:text-white">
                    {passenger.full_name}
                  </Td>
                  <Td className="whitespace-nowrap font-mono">{passenger.phone || '-'}</Td>
                  <Td className="whitespace-nowrap font-mono text-slate-500">
                    <span title={passenger.email ?? undefined}>{passenger.email || '-'}</span>
                  </Td>
                  <Td className="whitespace-nowrap font-bold text-bolman-purple">{formatMoney(passenger.balance)}</Td>
                </tr>
              ))}
            </DataTable>

            {totalPages > 1 ? (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                disabled={passengersQuery.isPending}
              />
            ) : null}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-start">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setSelectedPassenger(null);
                setFeedback(null);
              }}
              className="flex items-center gap-2"
            >
              <span className="font-black">←</span>
              <span>العودة لدليل المحافظ</span>
            </Button>
          </div>

          <Card className="border-bolman-purple/15 bg-gradient-to-r from-bolman-purple/10 via-white to-bolman-mint/15 dark:from-bolman-purple/20 dark:via-bolman-cardDark dark:to-bolman-mint/20 shadow-md">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-bolman-purple">
                  {messages.company.wallets.passengerCardTitle}
                </p>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                  {summaryQuery.data?.full_name ?? selectedPassenger.full_name}
                </h2>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {summaryQuery.data?.phone ?? selectedPassenger.phone ?? '-'} · {summaryQuery.data?.email ?? selectedPassenger.email ?? '-'}
                </p>
              </div>
              <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-bolman-surfaceDark">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bolman-purple/10 text-bolman-purple">
                  <WalletCards size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {messages.company.wallets.currentBalance}
                  </div>
                  <p className="text-2xl font-black text-bolman-purple">{formatMoney(currentBalance)}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200/60 pt-4 dark:border-slate-800">
              <Button onClick={() => { setSourceType('office'); setAction('topup'); }}>
                {messages.company.wallets.topupButton}
              </Button>
              <Button variant="mint" onClick={() => { setSourceType('office'); setAction('withdraw'); }}>
                {messages.company.wallets.withdrawButton}
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>{messages.company.wallets.transactionsTitle}</CardTitle>
            <div className="mt-4">
              <DataTable columns={messages.company.wallets.table as unknown as string[]} loading={transactionsQuery.isPending} empty={!transactionsQuery.isPending && !transactions.length}>
                {transactions.map((transaction) => (
                  <tr key={transaction.transaction_id}>
                    <Td className="whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">{formatDateTime(transaction.created_at)}</Td>
                    <Td className="whitespace-nowrap">
                      <Badge tone={transaction.transaction_type === 'credit' ? 'green' : 'red'}>
                        {transaction.transaction_type === 'credit' ? messages.company.wallets.credit : messages.company.wallets.debit}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">{messages.company.wallets.sourceLabels[transaction.source_type] ?? transaction.source_type}</Td>
                    <Td className="whitespace-nowrap font-bold text-slate-900 dark:text-white">{formatMoney(transaction.amount)}</Td>
                    <Td className="whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">{formatMoney(transaction.balance_after ?? transaction.computed_balance_after)}</Td>
                    <Td className="whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">{transaction.performed_by_name ?? '-'}</Td>
                    <Td className="min-w-[12rem] text-slate-600 dark:text-slate-400">{transaction.notes || '-'}</Td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={!!action}
        onClose={() => {
          if (!submitting) resetAction();
        }}
        title={
          action === 'topup'
            ? messages.company.wallets.topupModalTitle
            : messages.company.wallets.withdrawModalTitle
        }
      >
        <div className="grid gap-4">
          <Field label="المصدر">
            <Select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={messages.company.wallets.amountLabel}>
            <Input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label={messages.company.wallets.notesLabel}>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={messages.company.wallets.notesPlaceholder} />
          </Field>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-bolman-surfaceDark dark:text-slate-300">
            {messages.company.wallets.currentBalance}: <span className="font-bold text-bolman-purple">{formatMoney(currentBalance)}</span>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={resetAction} disabled={submitting}>
              {messages.common.close}
            </Button>
            <Button
              onClick={submitAction}
              disabled={submitting}
            >
              {submitting ? messages.common.loading : messages.company.wallets.confirmAction}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
