import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { PrazoDialog } from '@/components/prazo-dialog.js';
import { ALERTA_VARIANT, alertaDoPrazo, PRAZO_STATUS_VARIANT } from '@/components/prazo-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type PrazoRecord, prazosDaPericiaQuery } from '@/query/prazo.js';
import { PrazoForm } from './prazo-form.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

type PrazoPanel =
  | { kind: 'create' }
  | { kind: 'edit'; prazo: PrazoRecord }
  | { kind: 'detail'; prazo: PrazoRecord }
  | null;

// Todos os prazos do processo (PRZ-01), por vencimento: pendentes com alerta de
// vencido/vence em breve, protocolados com a data de entrega, perdidos no histórico.
export function PericiaPrazos({ periciaId }: { periciaId: string }) {
  const query = useQuery(prazosDaPericiaQuery(periciaId));
  const [panel, setPanel] = useState<PrazoPanel>(null);
  const today = formatDisplayDate(new Date());

  return (
    <Panel
      size="sm"
      title={t('deadlines')}
      actions={
        <Button variant="outline" onClick={() => setPanel({ kind: 'create' })}>
          {t('add_deadline')}
        </Button>
      }
    >
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.length ? (
        <DefaultEmptyData title={t('no_deadlines_yet')} />
      ) : (
        <LinkList>
          {query.data.map((prazo) => {
            const alerta = alertaDoPrazo(prazo, today);
            return (
              <LinkListItem
                key={prazo.id}
                icon={CalendarClock}
                render={
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setPanel({ kind: 'detail', prazo })}
                  />
                }
                title={prazo.titulo}
                badges={
                  <>
                    <Badge variant={PRAZO_STATUS_VARIANT[prazo.status]}>{t(prazo.status)}</Badge>
                    {alerta && <Badge variant={ALERTA_VARIANT[alerta]}>{t(alerta)}</Badge>}
                  </>
                }
                description={[
                  `${t('due_on')} ${day(prazo.vencimento)}`,
                  prazo.protocoladoEm && `${t('filed_on')} ${day(prazo.protocoladoEm)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            );
          })}
        </LinkList>
      )}
      {panel?.kind === 'create' && <PrazoForm periciaId={periciaId} onClose={() => setPanel(null)} />}
      {panel?.kind === 'edit' && <PrazoForm periciaId={periciaId} prazo={panel.prazo} onClose={() => setPanel(null)} />}
      {panel?.kind === 'detail' && (
        <PrazoDialog
          prazo={panel.prazo}
          onClose={() => setPanel(null)}
          onEdit={() => setPanel({ kind: 'edit', prazo: panel.prazo })}
        />
      )}
    </Panel>
  );
}
