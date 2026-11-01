import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { runSync, useStateSync } from '@/lib/offline/sync.js';

// Field screen connection strip (AD-128): what is only on the device and the sending.
export function FieldConnection({ ofDevice }: { ofDevice?: boolean }) {
  const queryClient = useQueryClient();
  const sync = useStateSync();
  if (sync.online && !sync.pending && !ofDevice) return null;

  return (
    <Panel size="xs" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {!sync.online && <CloudOff className="size-4 text-status-warning-indicator" aria-hidden />}
        <ItemDescription className="line-clamp-none flex-1">
          {[
            !sync.online && t('offline_working_on_device'),
            ofDevice && t('showing_copy_saved_on_device'),
            sync.pending > 0 && `${sync.pending} ${t('items_waiting_to_send')}`,
            sync.conflicts > 0 && `${sync.conflicts} ${t('conflicts_to_review')}`,
            sync.failures > 0 && `${sync.failures} ${t('uploads_failed')}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ItemDescription>
        {sync.online && sync.pending > 0 && (
          <Button variant="outline" disabled={sync.syncing} onClick={() => void runSync(queryClient)}>
            <RefreshCw className={sync.syncing ? 'animate-spin' : undefined} />
            {t('send_now')}
          </Button>
        )}
      </div>
    </Panel>
  );
}
