import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { useState } from 'react';
import { DeadlineDialog } from '@/components/deadline-dialog.js';
import { ALERTA_VARIANT, DEADLINE_STATUS_VARIANT, deadlineAlert } from '@/components/deadline-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseDeadlinesQuery, type DeadlineRecord } from '@/query/deadline.js';
import { DeadlineForm } from './deadline-form.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

type DeadlinePanel =
  | { kind: 'create' }
  | { kind: 'edit'; deadline: DeadlineRecord }
  | { kind: 'detail'; deadline: DeadlineRecord }
  | null;

// Todos os prazos do processo (PRZ-01), por vencimento: pendentes com alerta de
// vencido/vence em breve, protocolados com a data de entrega, perdidos no histórico.
export function CaseDeadlines({ caseId }: { caseId: string }) {
  const query = useQuery(caseDeadlinesQuery(caseId));
  const [panel, setPanel] = useState<DeadlinePanel>(null);
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
          {query.data.map((deadline) => {
            const alerta = deadlineAlert(deadline, today);
            return (
              <LinkListItem
                key={deadline.id}
                icon={CalendarClock}
                render={
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setPanel({ kind: 'detail', deadline })}
                  />
                }
                title={deadline.titulo}
                badges={
                  <>
                    <Badge variant={DEADLINE_STATUS_VARIANT[deadline.status]}>{t(deadline.status)}</Badge>
                    {alerta && <Badge variant={ALERTA_VARIANT[alerta]}>{t(alerta)}</Badge>}
                  </>
                }
                description={[
                  `${t('due_on')} ${day(deadline.vencimento)}`,
                  deadline.filedDate && `${t('filed_on')} ${day(deadline.filedDate)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            );
          })}
        </LinkList>
      )}
      {panel?.kind === 'create' && <DeadlineForm caseId={caseId} onClose={() => setPanel(null)} />}
      {panel?.kind === 'edit' && (
        <DeadlineForm caseId={caseId} deadline={panel.deadline} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'detail' && (
        <DeadlineDialog
          deadline={panel.deadline}
          onClose={() => setPanel(null)}
          onEdit={() => setPanel({ kind: 'edit', deadline: panel.deadline })}
        />
      )}
    </Panel>
  );
}
