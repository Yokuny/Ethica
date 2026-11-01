import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQueryClient } from '@tanstack/react-query';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type OfficeView, officeKeys } from '../@query/office.js';

const EXPORT_PATH = '/documents/export';

// DOC-04: ZIP com um CSV por entidade; a API registra quem exportou e quando.
export function OfficeExport({ office }: { office: OfficeView }) {
  const queryClient = useQueryClient();
  const { download, pending } = useFileDownload();

  async function handleExport() {
    await download(EXPORT_PATH);
    queryClient.invalidateQueries({ queryKey: officeKeys.detail });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" disabled={pending === EXPORT_PATH} onClick={handleExport}>
        {t('export_data')}
      </Button>
      {office.dataExports.length ? (
        <ul className="grid gap-1">
          {office.dataExports.slice(0, 5).map((item) => (
            <li key={item.at}>
              <ItemDescription>
                {formatDateTime(new Date(item.at))} · {item.userName ?? t('removed_user')}
              </ItemDescription>
            </li>
          ))}
        </ul>
      ) : (
        <ItemDescription>{t('no_exports_yet')}</ItemDescription>
      )}
    </div>
  );
}
