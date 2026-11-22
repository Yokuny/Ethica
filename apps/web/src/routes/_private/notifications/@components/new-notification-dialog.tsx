import { useState } from 'react';
import { CasePicker } from '@/components/case-picker.js';
import { FormDialog } from '@/components/form-dialog.js';
import { NotificationForm } from '@/components/notification-form.js';
import { t } from '@/lib/helpers/translate.helper.js';

// New deadline or alert from the Central (AD-189, AD-263): first the service, then the same form of the case detail.
export function NewNotificationDialog({ onClose }: { onClose: () => void }) {
  const [caseId, setCaseId] = useState<string>();
  if (caseId) return <NotificationForm caseId={caseId} onClose={onClose} />;
  return (
    <FormDialog title={t('new_deadline_or_alert')} onClose={onClose}>
      <CasePicker onPick={setCaseId} />
    </FormDialog>
  );
}
