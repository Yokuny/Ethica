import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { FileSearch } from 'lucide-react';
import { TableIdentity, TableStack } from '@/components/data-table.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { DatajudResult } from '../../@query/opportunity.js';

type SearchResultsProps = {
  items: DatajudResult[];
  onSave: (item: DatajudResult) => void;
  saving: boolean;
};

const maybeDate = (value?: string) => (value && !Number.isNaN(Date.parse(value)) ? formatDate(value) : undefined);

// Datajud search result: process, class/subjects, last movement and "Salvar".
export function SearchResults({ items, onSave, saving }: SearchResultsProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('process')}</TableHead>
          <TableHead>{t('subjects')}</TableHead>
          <TableHead>{t('last_movement')}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.processNumber}>
            <TableCell>
              <TableIdentity icon={FileSearch} title={item.processNumber} description={item.courtUnit} />
            </TableCell>
            <TableCell>
              <TableStack description={item.subjects.slice(0, 2).join(' · ') || undefined}>
                {item.caseClass ?? '—'}
              </TableStack>
            </TableCell>
            <TableCell>
              <TableStack description={maybeDate(item.lastMovementAt)}>{item.lastMovement ?? '—'}</TableStack>
            </TableCell>
            <TableCell className="text-right">
              {item.opportunityId ? (
                <Badge variant="success">{t('saved')}</Badge>
              ) : (
                <Button variant="outline" size="sm" disabled={saving} onClick={() => onSave(item)}>
                  {t('save')}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
