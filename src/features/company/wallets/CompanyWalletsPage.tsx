import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, WalletCards } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { Field, Input, Textarea } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { DataTable, Td } from '../../../components/ui/Table';
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

export function CompanyWalletsPage() {
  const { profile } = useAuth();
  const { messages } = useI18n();
  const queryClient = useQueryClient();
  const companyPermissions = useCompanyStaffPermissions();
  const [search, setSearch] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<WalletPassengerSearchResult | null>(null);
  const [action, setAction] = useState<WalletAction | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);

  const canManageWallets =
    profile?.role === 'company_owner' ||
    !!companyPermissions.data?.can_manage_wallets ||
    !!companyPermissions.data?.can_manage_bookings;
  const passengersQuery = useInfiniteQuery({
    queryKey: ['wallet', 'passengers', search.trim()],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      searchPassengersForWallet(search, { limit: walletPassengerPageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) =>
      !lastPage || lastPage.length < walletPassengerPageSize ? undefined : allPages.length * walletPassengerPageSize,
    enabled: canManageWallets,
  });

  const passengers = useMemo(
    () => (passengersQuery.data?.pages ?? []).flat() as WalletPassengerSearchResult[],
    [passengersQuery.data],
  );

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
    setAmount('');
    setNotes('');
  }

  const topupMutation = useMutation({
    mutationFn: () => officeWalletTopup(selectedPassenger!.user_id, parsedAmount, notes),
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
    mutationFn: () => officeWalletWithdraw(selectedPassenger!.user_id, parsedAmount, notes),
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

    if (action === 'topup') topupMutation.mutate();
    if (action === 'withdraw') withdrawMutation.mutate();
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

  const transactions = transactionsQuery.data ?? [];
  const submitting = topupMutation.isPending || withdrawMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title={messages.company.wallets.title} subtitle={messages.company.wallets.subtitle} />

      {feedback ? (
        <div
          className={cx(
            'rounded-2xl border px-4 py-3 text-sm font-medium',
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      <Card>
        <CardTitle>{messages.company.wallets.searchTitle}</CardTitle>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <Field label={messages.company.wallets.searchLabel}>
              <div className="relative">
                <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  className="ps-11"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
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
              loading={passengersQuery.isPending && !passengersQuery.data}
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
                  className={cx(
                    'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-bolman-surfaceDark/80',
                    selectedPassenger?.user_id === passenger.user_id
                      ? 'bg-bolman-purple/5 dark:bg-bolman-purple/15'
                      : '',
                  )}
                >
                  <Td className="max-w-[14rem] whitespace-normal font-semibold text-slate-900 dark:text-white">
                    {passenger.full_name}
                  </Td>
                  <Td className="whitespace-nowrap">{passenger.phone || '-'}</Td>
                  <Td className="max-w-[12rem] truncate">
                    <span title={passenger.email ?? undefined}>{passenger.email || '-'}</span>
                  </Td>
                  <Td className="font-semibold text-bolman-purple">{formatMoney(passenger.balance)}</Td>
                </tr>
              ))}
            </DataTable>

            {passengersQuery.hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => passengersQuery.fetchNextPage()}
                  disabled={passengersQuery.isFetchingNextPage}
                >
                  {passengersQuery.isFetchingNextPage ? messages.common.loading : messages.company.wallets.loadMore}
                </Button>
              </div>
            ) : null}
          </div>

          <div>
            {!selectedPassenger ? (
              <div className="grid h-full min-h-56 place-items-center rounded-3xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-bolman-borderDark dark:text-slate-400">
                {messages.company.wallets.selectPassengerHint}
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="border-bolman-purple/10 bg-gradient-to-br from-bolman-purple/5 via-white to-bolman-mint/10 dark:from-bolman-purple/10 dark:via-bolman-cardDark dark:to-bolman-mint/10">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {messages.company.wallets.passengerCardTitle}
                      </p>
                      <h2 className="text-xl font-black text-slate-950 dark:text-white">
                        {summaryQuery.data?.full_name ?? selectedPassenger.full_name}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {summaryQuery.data?.phone ?? selectedPassenger.phone ?? '-'} · {summaryQuery.data?.email ?? selectedPassenger.email ?? '-'}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/80 px-5 py-4 text-center shadow-soft dark:bg-bolman-surfaceDark">
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        <WalletCards size={18} />
                        {messages.company.wallets.currentBalance}
                      </div>
                      <p className="mt-2 text-3xl font-black text-bolman-purple">{formatMoney(currentBalance)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button onClick={() => setAction('topup')}>{messages.company.wallets.topupButton}</Button>
                    <Button variant="mint" onClick={() => setAction('withdraw')}>{messages.company.wallets.withdrawButton}</Button>
                  </div>
                </Card>

                <Card>
                  <CardTitle>{messages.company.wallets.transactionsTitle}</CardTitle>
                  <div className="mt-4">
                    <DataTable columns={messages.company.wallets.table as unknown as string[]} loading={transactionsQuery.isPending} empty={!transactionsQuery.isPending && !transactions.length}>
                      {transactions.map((transaction) => (
                        <tr key={transaction.transaction_id}>
                          <Td>{formatDateTime(transaction.created_at)}</Td>
                          <Td>
                            <Badge tone={transaction.transaction_type === 'credit' ? 'green' : 'red'}>
                              {transaction.transaction_type === 'credit' ? messages.company.wallets.credit : messages.company.wallets.debit}
                            </Badge>
                          </Td>
                          <Td>{messages.company.wallets.sourceLabels[transaction.source_type] ?? transaction.source_type}</Td>
                          <Td className="font-semibold">{formatMoney(transaction.amount)}</Td>
                          <Td>{transaction.balance_after == null ? '-' : formatMoney(transaction.balance_after)}</Td>
                          <Td>{transaction.performed_by_name ?? '-'}</Td>
                          <Td>{transaction.notes || '-'}</Td>
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Modal
        open={!!action}
        onClose={() => {
          if (!submitting) resetAction();
        }}
        title={action === 'topup' ? messages.company.wallets.topupModalTitle : messages.company.wallets.withdrawModalTitle}
      >
        <div className="grid gap-4">
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
            <Button onClick={submitAction} disabled={submitting}>
              {submitting ? messages.common.loading : messages.company.wallets.confirmAction}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
