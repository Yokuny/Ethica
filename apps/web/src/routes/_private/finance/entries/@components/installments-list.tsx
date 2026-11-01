import { Button } from '@ethica/ui/components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type InstallmentRecord, reverseInstallmentMutation, type TransactionRecord } from '@/query/transaction.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Histórico de recebimentos do honorário (AD-111): recebido, saldo e estorno por parcela.
export function InstallmentsList({
  transaction,
  onChanged,
}: {
  transaction: TransactionRecord;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation(reverseInstallmentMutation(queryClient));
  const [reversing, setReversing] = useState<InstallmentRecord | null>(null);

  function handleEstorno() {
    if (!reversing) return;
    mutation.mutate(
      { id: transaction.id, installmentId: reversing.id },
      { onSuccess: onChanged, onError: (error: Error) => toast.error(error.message) },
    );
  }

  return (
    <Panel
      size="sm"
      title={t('receipts')}
      description={`${t('received')} ${formatMoney(transaction.receivedCents ?? 0)} · ${t('balance_due')} ${formatMoney(transaction.balanceCents ?? 0)}`}
    >
      {!transaction.installments.length ? (
        <DefaultEmptyData title={t('no_receipts_yet')} />
      ) : (
        <LinkList>
          {transaction.installments.map((installment) => (
            <LinkListItem
              key={installment.id}
              icon={Banknote}
              title={formatMoney(installment.amountCents)}
              description={[day(installment.data), installment.account].filter(Boolean).join(' · ')}
            >
              <div>
                <Button variant="outline" disabled={mutation.isPending} onClick={() => setReversing(installment)}>
                  {t('reverse_receipt')}
                </Button>
              </div>
            </LinkListItem>
          ))}
        </LinkList>
      )}
      {reversing && (
        <ConfirmDialog
          title={t('reverse_receipt_question')}
          description={`${formatMoney(reversing.amountCents)} · ${day(reversing.data)}`}
          confirmLabel={t('reverse_receipt')}
          pending={mutation.isPending}
          onConfirm={handleEstorno}
          onClose={() => setReversing(null)}
        />
      )}
    </Panel>
  );
}
