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
import { estornarParcelaMutation, type LancamentoRecord, type ParcelaRecord } from '@/query/lancamento.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Histórico de recebimentos do honorário (AD-111): recebido, saldo e estorno por parcela.
export function ParcelasList({ lancamento, onChanged }: { lancamento: LancamentoRecord; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation(estornarParcelaMutation(queryClient));
  const [estornando, setEstornando] = useState<ParcelaRecord | null>(null);

  function handleEstorno() {
    if (!estornando) return;
    mutation.mutate(
      { id: lancamento.id, parcelaId: estornando.id },
      { onSuccess: onChanged, onError: (error: Error) => toast.error(error.message) },
    );
  }

  return (
    <Panel
      size="sm"
      title={t('receipts')}
      description={`${t('received')} ${formatMoney(lancamento.recebidoCents ?? 0)} · ${t('balance_due')} ${formatMoney(lancamento.saldoCents ?? 0)}`}
    >
      {!lancamento.parcelas.length ? (
        <DefaultEmptyData title={t('no_receipts_yet')} />
      ) : (
        <LinkList>
          {lancamento.parcelas.map((parcela) => (
            <LinkListItem
              key={parcela.id}
              icon={Banknote}
              title={formatMoney(parcela.valorCents)}
              description={[day(parcela.data), parcela.conta].filter(Boolean).join(' · ')}
            >
              <div>
                <Button variant="outline" disabled={mutation.isPending} onClick={() => setEstornando(parcela)}>
                  {t('reverse_receipt')}
                </Button>
              </div>
            </LinkListItem>
          ))}
        </LinkList>
      )}
      {estornando && (
        <ConfirmDialog
          title={t('reverse_receipt_question')}
          description={`${formatMoney(estornando.valorCents)} · ${day(estornando.data)}`}
          confirmLabel={t('reverse_receipt')}
          pending={mutation.isPending}
          onConfirm={handleEstorno}
          onClose={() => setEstornando(null)}
        />
      )}
    </Panel>
  );
}
