import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { InspectionRecord } from '@/query/inspection.js';

type ConflictDialogProps = {
  server: InspectionRecord;
  onKeepMine: () => void;
  onUseServer: () => void;
  onClose: () => void;
};

// Someone else (or another device) saved first (AD-128): the expert picks which version stays.
export function ConflictDialog({ server, onKeepMine, onUseServer, onClose }: ConflictDialogProps) {
  const count = (data: InspectionRecord['data']) =>
    `${data.attendees.length} ${t('attendees').toLowerCase()} · ${data.jobs.length} ${t('job_roles').toLowerCase()} · ${data.agents.length} ${t('agents').toLowerCase()}`;
  return (
    <FormDialog
      title={t('inspection_conflict_title')}
      description={t('inspection_conflict_description')}
      onClose={onClose}
    >
      <ItemDescription className="line-clamp-none">
        {t('server_version')}: {server.updatedAt ? formatDateTime(server.updatedAt) : '—'} · {count(server.data)}
      </ItemDescription>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onUseServer}>
          {t('use_server_version')}
        </Button>
        <Button type="button" onClick={onKeepMine}>
          {t('keep_my_version')}
        </Button>
      </div>
    </FormDialog>
  );
}
