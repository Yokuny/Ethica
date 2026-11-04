import { useState } from 'react';
import { Checkbox } from '@/components/checkbox.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';

type AttachReportDialogProps = {
  fileName: string;
  pending: boolean;
  onConfirm: (recordDelivery: boolean) => void;
  onClose: () => void;
};

// ANL-02/03: the attached PDF is born completed; delivery works like completing a report (AD-126).
export function AttachReportDialog({ fileName, pending, onConfirm, onClose }: AttachReportDialogProps) {
  const [recordDelivery, setRecordDelivery] = useState(true);
  return (
    <ConfirmDialog
      title={t('attach_report_question')}
      description={fileName}
      confirmLabel={t('attach')}
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
