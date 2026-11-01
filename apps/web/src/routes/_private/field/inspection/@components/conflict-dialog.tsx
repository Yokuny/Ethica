import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { InspectionRecord } from '@/query/inspection.js';

type ConflictDialogProps = {
  server: InspectionRecord;
  onManterMinha: () => void;
  onUseServer: () => void;
  onClose: () => void;
};

// Outra pessoa (ou outro aparelho) salvou antes (AD-128): o perito escolhe qual versão fica.
export function ConflictDialog({ server, onManterMinha, onUseServer, onClose }: ConflictDialogProps) {
  const contagem = (dados: InspectionRecord['dados']) =>
    `${dados.attendees.length} ${t('attendees').toLowerCase()} · ${dados.jobs.length} ${t('job_roles').toLowerCase()} · ${dados.agents.length} ${t('agents').toLowerCase()}`;
  return (
    <FormDialog
      title={t('inspection_conflict_title')}
      description={t('inspection_conflict_description')}
      onClose={onClose}
    >
      <ItemDescription className="line-clamp-none">
        {t('server_version')}: {server.updatedAt ? formatDateTime(server.updatedAt) : '—'} · {contagem(server.dados)}
      </ItemDescription>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onUseServer}>
          {t('use_server_version')}
        </Button>
        <Button type="button" onClick={onManterMinha}>
          {t('keep_my_version')}
        </Button>
      </div>
    </FormDialog>
  );
}
