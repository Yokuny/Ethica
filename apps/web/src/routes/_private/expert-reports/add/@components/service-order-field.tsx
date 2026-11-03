import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type CaseRecord, updateCaseMutation } from '@/query/case.js';

// OS linked to the report (NLA-03): the one of the service or, when it has none, typed here and saved on it.
export function ServiceOrderField({ legalCase }: { legalCase: CaseRecord }) {
  const queryClient = useQueryClient();
  const update = useMutation(updateCaseMutation(queryClient));
  const [value, setValue] = useState('');

  if (legalCase.serviceOrder) {
    return (
      <div className="flex flex-col gap-1">
        <ItemDescription>{t('service_order')}</ItemDescription>
        <ItemTitle className="font-mono">{legalCase.serviceOrder}</ItemTitle>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ItemDescription className="line-clamp-none">{t('service_without_service_order')}</ItemDescription>
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-full sm:w-60"
          value={value}
          aria-label={t('service_order')}
          placeholder="ETH-2026-001"
          onChange={(event) => setValue(event.target.value)}
        />
        <Button
          variant="outline"
          size="field"
          disabled={!value.trim() || update.isPending}
          onClick={() =>
            update.mutate(
              { id: legalCase.id, data: { serviceOrder: value.trim() } },
              { onError: (error) => toast.error(error.message) },
            )
          }
        >
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
