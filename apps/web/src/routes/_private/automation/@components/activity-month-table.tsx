import type { AutomationMonth } from '@ethica/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { t } from '@/lib/helpers/translate.helper.js';

const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// The exact numbers month by month, one click below the chart (AD-255), newest first.
export function ActivityMonthTable({ data }: { data: AutomationMonth[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('month')}</TableHead>
          <TableHead>{t('detected_movements')}</TableHead>
          <TableHead>{t('notices_sent')}</TableHead>
          <TableHead>{t('suggestions_made')}</TableHead>
          <TableHead>{t('court_queries')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...data].reverse().map((row) => (
          <TableRow key={row.month}>
            <TableCell>{monthLong.format(new Date(`${row.month}-15T12:00:00Z`))}</TableCell>
            <TableCell className="tabular-nums">{row.movements}</TableCell>
            <TableCell className="tabular-nums">{row.notices}</TableCell>
            <TableCell className="tabular-nums">{row.suggestions}</TableCell>
            <TableCell className="tabular-nums">
              {row.roundDays ? `${row.completeDays} ${t('of').toLowerCase()} ${row.roundDays} ${t('days')}` : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
