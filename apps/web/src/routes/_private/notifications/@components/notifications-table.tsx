import { BadgeIndicator } from '@ethica/ui/components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { CalendarClock } from 'lucide-react';
import { serviceLabel } from '@/components/case-labels.js';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { ALERT_VARIANT, DEADLINE_STATUS_VARIANT, deadlineAlert } from '@/components/notification-labels.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import type { TableExportColumn } from '@/lib/helpers/tableExport.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { NotificationRecord } from '@/query/notification.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Columns of the exported file (CSV, Excel, PDF): the same as the table, one text per cell.
export const deadlineExportColumns: TableExportColumn<NotificationRecord>[] = [
  { header: t('due_date'), value: (deadline) => day(deadline.dueDate) },
  { header: t('deadlines_and_alerts'), value: (deadline) => `${deadline.title} · ${t(deadline.kind)}` },
  { header: t('expert_case'), value: (deadline) => deadline.caseNumber },
  {
    header: t('contracting_party'),
    value: (deadline) => deadline.client ?? [deadline.plaintiff, deadline.defendant].filter(Boolean).join(' x '),
  },
  { header: t('service_type'), value: (deadline) => serviceLabel(deadline) },
  {
    header: t('status'),
    value: (deadline) => t(deadlineAlert(deadline, formatDisplayDate(new Date())) ?? deadline.status),
  },
];

type DeadlinesTableProps = {
  items: NotificationRecord[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPaginationChange: (state: { pageIndex: number; pageSize: number }) => void;
  onOpen: (deadline: NotificationRecord) => void;
};

// Deadlines and alerts of every service (AD-189), in the order the API gives (criticality); the row opens it.
export function NotificationsTable({
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
            <TableHead>{t('contracting_party')}</TableHead>
            <TableHead>{t('service_type')}</TableHead>
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
                    width="fit"
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
                  <TableStack width="fit" tone={deadline.caseNumber ? 'default' : 'muted'}>
                    {deadline.caseNumber ?? '—'}
                  </TableStack>
                </TableCell>
                <TableCell>
                  {/* As in the services list: whoever hired it; in a perícia, plaintiff above the defendant. */}
                  <TableStack width="text" description={deadline.client ? undefined : deadline.defendant}>
                    {deadline.client ?? deadline.plaintiff ?? '—'}
                  </TableStack>
                </TableCell>
                <TableCell>
                  <TableStack width="fit" tone={deadline.role ? 'default' : 'muted'}>
                    {serviceLabel(deadline) || '—'}
                  </TableStack>
                </TableCell>
                <TableCell>
                  <TableStatus variant={alert ? ALERT_VARIANT[alert] : DEADLINE_STATUS_VARIANT[deadline.status]}>
                    {alert && <BadgeIndicator variant={ALERT_VARIANT[alert]} />}
                    {t(alert ?? deadline.status)}
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
