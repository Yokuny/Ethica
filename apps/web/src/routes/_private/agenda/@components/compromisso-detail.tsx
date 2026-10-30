import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { AppLink } from '@/components/app-link.js';
import { COMPROMISSO_TIPO_VARIANT } from '@/components/compromisso-labels.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { FormDialog } from '@/components/form-dialog.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CompromissoRecord } from '@/query/compromisso.js';
import { useCompromissoActions } from '../@hooks/use-compromisso-actions.js';

type CompromissoDetailProps = { compromisso: CompromissoRecord; onEdit: () => void; onClose: () => void };

// Leitura do compromisso com as ações do dia a dia: concluir, cancelar, remarcar e remover.
export function CompromissoDetail({ compromisso, onEdit, onClose }: CompromissoDetailProps) {
  const { isPending, setStatus, isConfirmingDelete, askDelete, cancelDelete, handleDelete } = useCompromissoActions(
    compromisso,
    onClose,
  );
  const agendado = compromisso.status === 'agendado';

  return (
    <FormDialog title={compromisso.titulo} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <Badge variant={COMPROMISSO_TIPO_VARIANT[compromisso.tipo]}>{t(compromisso.tipo)}</Badge>
        <Badge variant="secondary">{t(compromisso.status)}</Badge>
        {compromisso.origem === 'automatico' && <Badge variant="outline">{t('created_automatically')}</Badge>}
      </div>
      <ProductSpecs
        groups={[
          {
            id: 'quando',
            name: t('commitment'),
            specs: [
              { label: t('starts_at'), value: formatDateTime(compromisso.inicio) },
              { label: t('ends_at'), value: formatDateTime(compromisso.fim) },
              { label: t('location'), value: compromisso.local || '-' },
              {
                label: t('pericia'),
                value:
                  compromisso.periciaId && compromisso.periciaNumero ? (
                    <AppLink to="/pericias/details" search={{ id: compromisso.periciaId }}>
                      {compromisso.periciaNumero}
                    </AppLink>
                  ) : (
                    '-'
                  ),
              },
              { label: t('notes'), value: compromisso.observacoes || '-' },
            ],
          },
        ]}
      />
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="destructive" disabled={isPending} onClick={askDelete}>
          {t('remove')}
        </Button>
        <div className="flex flex-wrap gap-2">
          {agendado && (
            <Button variant="outline" disabled={isPending} onClick={() => setStatus('cancelado')}>
              {t('cancel_commitment')}
            </Button>
          )}
          <Button variant="outline" disabled={isPending} onClick={onEdit}>
            {t('edit')}
          </Button>
          {agendado && (
            <Button disabled={isPending} onClick={() => setStatus('concluido')}>
              {t('mark_as_done')}
            </Button>
          )}
        </div>
      </div>
      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('remove_commitment_question')}
          description={t('action_cannot_be_undone')}
          confirmLabel={t('remove')}
          pending={isPending}
          onConfirm={handleDelete}
          onClose={cancelDelete}
        />
      )}
    </FormDialog>
  );
}
