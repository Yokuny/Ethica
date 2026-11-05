import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Hash } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceOrderPreviewQuery } from '@/query/case.js';

// Service order indicator of the services screen (AD-190): the next number the registration gets (with the
// office sequence) and the last one used. Nothing while the office has no OS yet.
export function CasesServiceOrder() {
  const preview = useQuery(serviceOrderPreviewQuery).data;
  if (!preview?.next && !preview?.last) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
      <Hash aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {preview.next && (
        <div>
          <ItemDescription className="text-xs">{t('next_service_order')}</ItemDescription>
          <ItemTitle className="font-normal">{preview.next}</ItemTitle>
        </div>
      )}
      {preview.last && (
        <div className={preview.next ? 'border-s ps-2' : undefined}>
          <ItemDescription className="text-xs">{t('last_service_order')}</ItemDescription>
          <ItemTitle className="font-normal">{preview.last}</ItemTitle>
        </div>
      )}
    </div>
  );
}
