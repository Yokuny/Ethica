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
import { type CaseRecord, removeMovementMutation } from '@/query/case.js';
import { MovementForm } from './movement-form.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

type Movement = CaseRecord['movements'][number];

// Process movements (AD-121): with none for more than 60 days, the case shows up
// in the stalled cases report. Tapping a row offers to remove it.
export function CaseMovements({ legalCase }: { legalCase: CaseRecord }) {
  const queryClient = useQueryClient();
  const removeMutation = useMutation(removeMovementMutation(queryClient));
  const [isAdding, setIsAdding] = useState(false);
  const [removing, setRemoving] = useState<Movement | null>(null);

  function handleRemove() {
    if (!removing || removeMutation.isPending) return;
    removeMutation.mutate(
      { caseId: legalCase.id, movementId: removing.id },
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
      {!legalCase.movements.length ? (
        <DefaultEmptyData title={t('no_movements_yet')} />
      ) : (
        <LinkList>
          {legalCase.movements.map((movement) => (
            <LinkListItem
              key={movement.id}
              icon={History}
              render={<button type="button" className="w-full text-left" onClick={() => setRemoving(movement)} />}
              title={t(movement.type)}
              description={[day(movement.data), movement.notes].filter(Boolean).join(' · ')}
            />
          ))}
        </LinkList>
      )}
      {isAdding && <MovementForm caseId={legalCase.id} onClose={() => setIsAdding(false)} />}
      {removing && (
        <ConfirmDialog
          title={t('remove_movement_question')}
          description={`${t(removing.type)} · ${day(removing.data)}`}
          confirmLabel={t('remove')}
          pending={removeMutation.isPending}
          onConfirm={handleRemove}
          onClose={() => setRemoving(null)}
        />
      )}
    </Panel>
  );
}
