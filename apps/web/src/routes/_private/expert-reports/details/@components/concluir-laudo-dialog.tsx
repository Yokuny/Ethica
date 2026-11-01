import { useState } from 'react';
import { Checkbox } from '@/components/checkbox.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';

type ConcluirLaudoDialogProps = {
  pending: boolean;
  onConfirm: (recordDelivery: boolean) => void;
  onClose: () => void;
};

// LAU-03.4: concluir bloqueia a edição; a entrega protocola o prazo "Entrega do laudo",
// lança a movimentação e avança a etapa da perícia (AD-126).
export function ConcluirLaudoDialog({ pending, onConfirm, onClose }: ConcluirLaudoDialogProps) {
  const [recordDelivery, setRecordDelivery] = useState(true);
  return (
    <ConfirmDialog
      title={t('complete_report_question')}
      description={t('complete_report_description')}
      confirmLabel={t('complete')}
      variant="default"
      pending={pending}
      onConfirm={() => onConfirm(recordDelivery)}
      onClose={onClose}
    >
      <Checkbox
        checked={recordDelivery}
        onCheckedChange={(checked) => setRecordDelivery(Boolean(checked))}
        label={t('register_delivery_on_expert_case')}
        labelClassName="normal-case tracking-normal"
      />
    </ConfirmDialog>
  );
}
