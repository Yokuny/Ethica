import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { Landmark } from 'lucide-react';
import { courtTypeLabel } from '@/components/case-labels.js';
import { TableIdentity, TableRowAction, TableRowActions, TableStack } from '@/components/data-table.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CourtDivisionRecord } from '@/query/court-division.js';

type CourtDivisionsTableProps = {
  data: CourtDivisionRecord[];
  onEdit?: (division: CourtDivisionRecord) => void;
  onRemove?: (division: CourtDivisionRecord) => void;
};

// The API returns the whole filtered list (AD-151), so there is no pagination; the row opens the edit form.
export function CourtDivisionsTable({ data, onEdit, onRemove }: CourtDivisionsTableProps) {
  const hasActions = Boolean(onEdit || onRemove);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('court_division')}</TableHead>
          <TableHead>{t('location')}</TableHead>
          <TableHead>{t('contact')}</TableHead>
          {hasActions && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((division) => (
          <TableRow
            key={division.id}
            onClick={onEdit && (() => onEdit(division))}
            className={onEdit ? 'cursor-pointer' : undefined}
          >
            <TableCell>
              <TableIdentity
                icon={Landmark}
                title={division.name}
                description={[courtTypeLabel(division.courtType), division.court].filter(Boolean).join(' · ')}
              />
            </TableCell>
            <TableCell>
              <TableStack width="text" description={division.address}>
                {`${division.city}/${division.state}`}
              </TableStack>
            </TableCell>
            <TableCell>
              <TableStack width="fit" description={division.phones ? division.email : undefined}>
                {division.phones ?? division.email ?? '—'}
              </TableStack>
            </TableCell>
            {hasActions && (
              <TableCell>
                <TableRowActions label={t('actions')}>
                  {onEdit && <TableRowAction onClick={() => onEdit(division)}>{t('edit')}</TableRowAction>}
                  {onRemove && (
                    <TableRowAction variant="destructive" onClick={() => onRemove(division)}>
                      {t('remove')}
                    </TableRowAction>
                  )}
                </TableRowActions>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
