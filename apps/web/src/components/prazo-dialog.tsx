import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { AppLink } from '@/components/app-link.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DatePicker } from '@/components/date-picker.js';
import { FormDialog } from '@/components/form-dialog.js';
import { ALERTA_VARIANT, alertaDoPrazo, PRAZO_STATUS_VARIANT } from '@/components/prazo-labels.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { deletePrazoMutation, type PrazoRecord, updatePrazoMutation } from '@/query/prazo.js';

const day = (value?: string) => (value ? formatDate(new Date(`${value}T12:00:00`)) : '-');

type PrazoDialogProps = {
  prazo: PrazoRecord;
  onClose: () => void;
  // Só o detalhe da perícia edita título/vencimento; a agenda abre a perícia.
  onEdit?: () => void;
  // Bloco extra abaixo da leitura (a agenda mostra os recebimentos da perícia).
  children?: ReactNode;
};

// Leitura do prazo com as ações do dia a dia (AD-109): protocolar com a data de
// entrega, marcar perdido, reabrir e remover. Usado pela perícia e pela agenda.
export function PrazoDialog({ prazo, onClose, onEdit, children }: PrazoDialogProps) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation(updatePrazoMutation(queryClient));
  const deleteMutation = useMutation(deletePrazoMutation(queryClient));
  const today = formatDisplayDate(new Date());
  const [protocoladoEm, setProtocoladoEm] = useState(today);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isPending = updateMutation.isPending || deleteMutation.isPending;
  const alerta = alertaDoPrazo(prazo, today);
  const onError = (error: Error) => toast.error(error.message);

  function setStatus(data: Parameters<typeof updateMutation.mutate>[0]['data']) {
    updateMutation.mutate({ id: prazo.id, data }, { onSuccess: onClose, onError });
  }

  function handleDelete() {
    deleteMutation.mutate({ id: prazo.id }, { onSuccess: onClose, onError });
  }

  return (
    <FormDialog title={prazo.titulo} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge variant={PRAZO_STATUS_VARIANT[prazo.status]}>{t(prazo.status)}</Badge>
        {alerta && <Badge variant={ALERTA_VARIANT[alerta]}>{t(alerta)}</Badge>}
      </div>
      <ProductSpecs
        groups={[
          {
            id: 'prazo',
            name: t('deadline'),
            specs: [
              { label: t('due_date'), value: day(prazo.vencimento) },
              { label: t('filed_on'), value: day(prazo.protocoladoEm) },
              {
                label: t('expert_case'),
                value: prazo.periciaNumero ? (
                  <AppLink to="/pericias/details" search={{ id: prazo.periciaId }}>
                    {prazo.periciaNumero}
                  </AppLink>
                ) : (
                  '-'
                ),
              },
              { label: t('notes'), value: prazo.observacoes || '-' },
            ],
          },
        ]}
      />
      {children}
      {prazo.status === 'pending' && (
        <div className="grid gap-2">
          <ItemDescription className="line-clamp-none">{t('filing_date')}</ItemDescription>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-48 flex-1">
              <DatePicker
                value={protocoladoEm}
                onChange={(value) => setProtocoladoEm(value ?? '')}
                placeholder={t('choose_day')}
              />
            </div>
            <Button
              size="field"
              disabled={isPending || !protocoladoEm}
              onClick={() => setStatus({ status: 'filed', protocoladoEm })}
            >
              {t('register_filing')}
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="destructive" disabled={isPending} onClick={() => setIsConfirmingDelete(true)}>
          {t('remove')}
        </Button>
        <div className="flex flex-wrap gap-2">
          {prazo.status === 'pending' ? (
            <Button variant="outline" disabled={isPending} onClick={() => setStatus({ status: 'missed' })}>
              {t('mark_as_missed')}
            </Button>
          ) : (
            <Button variant="outline" disabled={isPending} onClick={() => setStatus({ status: 'pending' })}>
              {t('reopen')}
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" disabled={isPending} onClick={onEdit}>
              {t('edit')}
            </Button>
          )}
        </div>
      </div>
      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('remove_deadline_question')}
          description={t('action_cannot_be_undone')}
          confirmLabel={t('remove')}
          pending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => setIsConfirmingDelete(false)}
        />
      )}
    </FormDialog>
  );
}
