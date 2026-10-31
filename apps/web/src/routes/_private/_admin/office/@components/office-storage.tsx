import { ItemDescription } from '@ethica/ui/components/item';
import { Progress } from '@/components/progress.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { OfficeView } from '../@query/office.js';

const UNITS = ['B', 'KB', 'MB', 'GB'];
const size = (bytes: number) => {
  const exponent = Math.min(UNITS.length - 1, Math.max(0, Math.floor(Math.log(bytes || 1) / Math.log(1024))));
  const value = bytes / 1024 ** exponent;
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${UNITS[exponent]}`;
};

export function OfficeStorage({ office }: { office: OfficeView }) {
  return (
    <div className="grid w-full gap-2">
      <Progress value={office.storageBytes} max={office.storageQuotaBytes} aria-label={t('storage_used')} />
      <ItemDescription>
        {size(office.storageBytes)} {t('of')} {size(office.storageQuotaBytes)}
      </ItemDescription>
    </div>
  );
}
