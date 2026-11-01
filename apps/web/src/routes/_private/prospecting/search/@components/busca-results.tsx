import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { FileSearch } from 'lucide-react';
import { TableIdentity, TableStack } from '@/components/data-table.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { DatajudResultado } from '../../@query/oportunidade.js';

type BuscaResultsProps = {
  items: DatajudResultado[];
  onSave: (item: DatajudResultado) => void;
  saving: boolean;
};

const maybeDate = (value?: string) => (value && !Number.isNaN(Date.parse(value)) ? formatDate(value) : undefined);

// Resultado da busca no Datajud: processo, classe/assuntos, último movimento e "Salvar".
export function BuscaResults({ items, onSave, saving }: BuscaResultsProps) {
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
              <TableIdentity icon={FileSearch} title={item.processNumber} description={item.orgaoJulgador} />
            </TableCell>
            <TableCell>
              <TableStack description={item.assuntos.slice(0, 2).join(' · ') || undefined}>
                {item.classe ?? '—'}
              </TableStack>
            </TableCell>
            <TableCell>
              <TableStack description={maybeDate(item.lastMovementAt)}>{item.lastMovement ?? '—'}</TableStack>
            </TableCell>
            <TableCell className="text-right">
              {item.oportunidadeId ? (
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
