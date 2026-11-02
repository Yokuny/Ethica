import { Button } from '@ethica/ui/components/button';
import { Pencil, Trash2 } from 'lucide-react';
import { courtTypeLabel } from '@/components/case-labels.js';
import { CourtDivisionContacts } from '@/components/court-division-contacts.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CourtDivisionRecord } from '@/query/court-division.js';

type CourtDivisionCardProps = {
  division: CourtDivisionRecord;
  onEdit?: () => void;
  onRemove?: () => void;
};

export function CourtDivisionCard({ division, onEdit, onRemove }: CourtDivisionCardProps) {
  return (
    <Panel
      size="sm"
      title={division.name}
      description={[courtTypeLabel(division.courtType), division.court, `${division.city}/${division.state}`]
        .filter(Boolean)
        .join(' · ')}
      actions={
        (onEdit || onRemove) && (
          <>
            {onEdit && (
              <Button variant="ghost" size="icon" aria-label={t('edit')} onClick={onEdit}>
                <Pencil />
              </Button>
            )}
            {onRemove && (
              <Button variant="ghost" size="icon" aria-label={t('remove')} onClick={onRemove}>
                <Trash2 />
              </Button>
            )}
          </>
        )
      }
    >
      <CourtDivisionContacts division={division} />
    </Panel>
  );
}
