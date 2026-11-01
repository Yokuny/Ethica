import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { sincronizar, useEstadoSync } from '@/lib/offline/sync.js';

// Faixa de conexão da tela de campo (AD-128): o que está só no aparelho e o envio.
export function CampoConexao({ doAparelho }: { doAparelho?: boolean }) {
  const queryClient = useQueryClient();
  const sync = useEstadoSync();
  if (sync.online && !sync.pendentes && !doAparelho) return null;

  return (
    <Panel size="xs" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {!sync.online && <CloudOff className="size-4 text-status-warning-indicator" aria-hidden />}
        <ItemDescription className="line-clamp-none flex-1">
          {[
            !sync.online && t('offline_working_on_device'),
            doAparelho && t('showing_copy_saved_on_device'),
            sync.pendentes > 0 && `${sync.pendentes} ${t('items_waiting_to_send')}`,
            sync.conflitos > 0 && `${sync.conflitos} ${t('conflicts_to_review')}`,
            sync.falhas > 0 && `${sync.falhas} ${t('uploads_failed')}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ItemDescription>
        {sync.online && sync.pendentes > 0 && (
          <Button variant="outline" disabled={sync.sincronizando} onClick={() => void sincronizar(queryClient)}>
            <RefreshCw className={sync.sincronizando ? 'animate-spin' : undefined} />
            {t('send_now')}
          </Button>
        )}
      </div>
    </Panel>
  );
}
