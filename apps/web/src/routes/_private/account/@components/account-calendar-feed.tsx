import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { DefaultLoading } from '@/components/default-loading.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { calendarFeedQuery, gerarCalendarFeedMutation, revogarCalendarFeedMutation } from '../@query/account.js';

// PRZ-03: link secreto para assinar a agenda e os prazos no Google, Outlook ou Apple.
// O link só aparece logo depois de gerado; gerar de novo invalida o anterior.
export function AccountCalendarFeed() {
  const queryClient = useQueryClient();
  const query = useQuery(calendarFeedQuery);
  const gerar = useMutation(gerarCalendarFeedMutation(queryClient));
  const revogar = useMutation(revogarCalendarFeedMutation(queryClient));
  const [url, setUrl] = useState<string | null>(null);
  const isPending = gerar.isPending || revogar.isPending;
  const onError = (error: Error) => toast.error(error.message);

  if (query.isLoading || !query.data) return <DefaultLoading />;

  function handleCopy() {
    if (!url) return;
    void navigator.clipboard.writeText(url).then(() => toast.success(t('link_copied')));
  }

  return (
    <div className="grid gap-3">
      {url ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Input readOnly value={url} aria-label={t('calendar_link')} className="min-w-64 flex-1" />
            <Button size="field" onClick={handleCopy}>
              {t('copy_link')}
            </Button>
          </div>
          <ItemDescription className="line-clamp-none">{t('calendar_link_shown_once')}</ItemDescription>
        </>
      ) : (
        <ItemDescription className="line-clamp-none">
          {t(query.data.active ? 'calendar_link_active' : 'calendar_link_inactive')}
        </ItemDescription>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={query.data.active ? 'outline' : 'default'}
          disabled={isPending}
          onClick={() => gerar.mutate(undefined, { onSuccess: setUrl, onError })}
        >
          {t(query.data.active ? 'generate_new_link' : 'generate_link')}
        </Button>
        {query.data.active && (
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => revogar.mutate(undefined, { onSuccess: () => setUrl(null), onError })}
          >
            {t('revoke_link')}
          </Button>
        )}
      </div>
    </div>
  );
}
