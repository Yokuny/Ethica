import { useState } from 'react';
import { CasePicker } from '@/components/case-picker.js';
import { DeadlineForm } from '@/components/deadline-form.js';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';

// New deadline or alert from "Prazos e Alertas" (AD-189): first the service, then the same form of the case detail.
export function NewDeadlineDialog({ onClose }: { onClose: () => void }) {
  const [caseId, setCaseId] = useState<string>();
  if (caseId) return <DeadlineForm caseId={caseId} onClose={onClose} />;
  return (
    <FormDialog title={t('new_deadline_or_alert')} onClose={onClose}>
      <CasePicker onPick={setCaseId} />
    </FormDialog>
  );
}
