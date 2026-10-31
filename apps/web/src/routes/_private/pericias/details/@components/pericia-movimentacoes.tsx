import { Button } from '@ethica/ui/components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type PericiaRecord, removeMovimentacaoMutation } from '@/query/pericia.js';
import { MovimentacaoForm } from './movimentacao-form.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

type Movimentacao = PericiaRecord['movimentacoes'][number];

// Movimentações do processo (AD-121): sem nenhuma há mais de 60 dias, a perícia aparece
// no relatório de perícias paradas. Tocar numa linha oferece removê-la.
export function PericiaMovimentacoes({ pericia }: { pericia: PericiaRecord }) {
  const queryClient = useQueryClient();
  const removeMutation = useMutation(removeMovimentacaoMutation(queryClient));
  const [isAdding, setIsAdding] = useState(false);
  const [removing, setRemoving] = useState<Movimentacao | null>(null);

  function handleRemove() {
    if (!removing || removeMutation.isPending) return;
    removeMutation.mutate(
      { periciaId: pericia.id, movimentacaoId: removing.id },
      { onSuccess: () => setRemoving(null), onError: (error: Error) => toast.error(error.message) },
    );
  }

  return (
    <Panel
      size="sm"
      title={t('movements')}
      description={t('movements_panel_description')}
      actions={
        <Button variant="outline" onClick={() => setIsAdding(true)}>
          {t('add_movement')}
        </Button>
      }
    >
      {!pericia.movimentacoes.length ? (
        <DefaultEmptyData title={t('no_movements_yet')} />
      ) : (
        <LinkList>
          {pericia.movimentacoes.map((movimentacao) => (
            <LinkListItem
              key={movimentacao.id}
              icon={History}
              render={<button type="button" className="w-full text-left" onClick={() => setRemoving(movimentacao)} />}
              title={t(movimentacao.tipo)}
              description={[day(movimentacao.data), movimentacao.observacoes].filter(Boolean).join(' · ')}
            />
          ))}
        </LinkList>
      )}
      {isAdding && <MovimentacaoForm periciaId={pericia.id} onClose={() => setIsAdding(false)} />}
      {removing && (
        <ConfirmDialog
          title={t('remove_movement_question')}
          description={`${t(removing.tipo)} · ${day(removing.data)}`}
          confirmLabel={t('remove')}
          pending={removeMutation.isPending}
          onConfirm={handleRemove}
          onClose={() => setRemoving(null)}
        />
      )}
    </Panel>
  );
}
