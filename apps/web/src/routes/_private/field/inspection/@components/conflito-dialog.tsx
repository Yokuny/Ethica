import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { VistoriaRecord } from '@/query/vistoria.js';

type ConflitoDialogProps = {
  server: VistoriaRecord;
  onManterMinha: () => void;
  onUseServer: () => void;
  onClose: () => void;
};

// Outra pessoa (ou outro aparelho) salvou antes (AD-128): o perito escolhe qual versão fica.
export function ConflitoDialog({ server, onManterMinha, onUseServer, onClose }: ConflitoDialogProps) {
  const contagem = (dados: VistoriaRecord['dados']) =>
    `${dados.presentes.length} ${t('attendees').toLowerCase()} · ${dados.funcoes.length} ${t('job_roles').toLowerCase()} · ${dados.agentes.length} ${t('agents').toLowerCase()}`;
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
