import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { CalendarClock } from 'lucide-react';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { ALERT_VARIANT, DEADLINE_STATUS_VARIANT, deadlineAlert } from '@/components/deadline-labels.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { DeadlineRecord } from '@/query/deadline.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

type DeadlinesTableProps = {
  items: DeadlineRecord[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPaginationChange: (state: { pageIndex: number; pageSize: number }) => void;
  onOpen: (deadline: DeadlineRecord) => void;
};

// Deadlines and alerts of every service (AD-189), in the order the API gives (criticality); the row opens it.
export function DeadlinesTable({
  items,
  pageIndex,
  pageSize,
  pageCount,
  onPaginationChange,
  onOpen,
}: DeadlinesTableProps) {
  const today = formatDisplayDate(new Date());
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('due_date')}</TableHead>
            <TableHead>{t('deadlines_and_alerts')}</TableHead>
            <TableHead>{t('expert_case')}</TableHead>
            <TableHead>{t('status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((deadline) => {
            const alert = deadlineAlert(deadline, today);
            return (
              <TableRow key={deadline.id} onClick={() => onOpen(deadline)} className="cursor-pointer">
                <TableCell>
                  <TableStack
                    tone={alert === 'deadline_overdue' ? 'error' : 'default'}
                    description={alert ? t(alert) : undefined}
                    descriptionTone={alert === 'deadline_overdue' ? 'error' : 'muted'}
                  >
                    {day(deadline.dueDate)}
                  </TableStack>
                </TableCell>
                <TableCell>
                  <TableIdentity icon={CalendarClock} title={deadline.title} description={t(deadline.kind)} />
                </TableCell>
                <TableCell>
                  <TableStack tone={deadline.caseNumber ? 'default' : 'muted'}>{deadline.caseNumber ?? '—'}</TableStack>
                </TableCell>
                <TableCell>
                  <TableStatus variant={alert ? ALERT_VARIANT[alert] : DEADLINE_STATUS_VARIANT[deadline.status]}>
                    {t(deadline.status)}
                  </TableStatus>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPaginationChange={onPaginationChange}
      />
    </>
  );
}
