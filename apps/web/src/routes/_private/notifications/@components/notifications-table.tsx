import { isDatedNotification, type NotificationKind } from '@ethica/contracts';
import { BadgeIndicator, type IndicatorVariant } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarClock, type LucideIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import {
  ALERT_VARIANT,
  DEADLINE_STATUS_VARIANT,
  deadlineAlert,
  notificationText,
} from '@/components/notification-labels.js';
import { SuggestionActions } from '@/components/suggestions-list.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import type { TableExportColumn } from '@/lib/helpers/tableExport.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type DatedNotificationRecord, markReadMutation, type NotificationRecord } from '@/query/notification.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

const ICON: Record<NotificationKind, LucideIcon> = {
  deadline: CalendarClock,
  alert: CalendarClock,
  suggestion: Sparkles,
  notice: Bell,
};

// The situation of any kind (AD-282): a pending deadline or alert by its criticality (AD-190); an open suggestion
// waits for approval; an open notice is new; the resolved ones by their status.
const situation = (item: NotificationRecord, today: string): { key: string; variant: IndicatorVariant } => {
  if (item.kind === 'notice') return item.open ? { key: 'new', variant: 'info' } : { key: 'read', variant: 'neutral' };
  if (item.kind === 'suggestion') {
    return item.open
      ? { key: 'suggestions_to_approve', variant: 'warning' }
      : { key: item.status ?? 'done', variant: item.status === 'accepted' ? 'success' : 'neutral' };
  }
  const alert = item.dueDate ? deadlineAlert({ dueDate: item.dueDate, status: item.status }, today) : undefined;
  if (alert) return { key: alert, variant: ALERT_VARIANT[alert] };
  return { key: item.status ?? 'pending', variant: (item.status && DEADLINE_STATUS_VARIANT[item.status]) ?? 'info' };
};

// The case as in the services list: its number, and whoever hired it (in a perícia, plaintiff x defendant).
const party = (item: NotificationRecord) => item.client ?? [item.plaintiff, item.defendant].filter(Boolean).join(' x ');

// Columns of the exported file (CSV, Excel, PDF): the same as the table, one text per cell.
export const notificationExportColumns: TableExportColumn<NotificationRecord>[] = [
  { header: t('date'), value: (item) => day(item.date) },
  { header: t('notification'), value: (item) => notificationText(item).title },
  { header: t('expert_case'), value: (item) => item.caseNumber ?? '' },
  { header: t('contracting_party'), value: party },
  { header: t('status'), value: (item) => t(situation(item, formatDisplayDate(new Date())).key) },
];

type NotificationsTableProps = {
  items: NotificationRecord[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPaginationChange: (state: { pageIndex: number; pageSize: number }) => void;
  onOpen: (item: DatedNotificationRecord) => void;
};

// Every notification in one table (AD-282), in the order the API gives. A deadline or alert opens its dialog; an
// open suggestion is approved or rejected and an open notice is marked as read on the row itself.
export function NotificationsTable({
  items,
  pageIndex,
  pageSize,
  pageCount,
  onPaginationChange,
  onOpen,
}: NotificationsTableProps) {
  const queryClient = useQueryClient();
  const read = useMutation(markReadMutation(queryClient));
  const today = formatDisplayDate(new Date());

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('date')}</TableHead>
            <TableHead>{t('notification')}</TableHead>
            <TableHead>{t('expert_case')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const text = notificationText(item);
            const status = situation(item, today);
            const overdue = status.key === 'deadline_overdue';
            return (
              <TableRow
                key={item.id}
                onClick={isDatedNotification(item) ? () => onOpen(item) : undefined}
                className={isDatedNotification(item) ? 'cursor-pointer' : undefined}
              >
                <TableCell>
                  <TableStack width="fit" tone={overdue ? 'error' : 'default'}>
                    {day(item.date)}
                  </TableStack>
                </TableCell>
                <TableCell>
                  <TableIdentity icon={ICON[item.kind]} title={text.title} description={text.description} />
                </TableCell>
                <TableCell>
                  <TableStack width="text" tone={item.caseNumber ? 'default' : 'muted'} description={party(item)}>
                    {item.caseNumber ?? '—'}
                  </TableStack>
                </TableCell>
                <TableCell>
                  <TableStatus variant={status.variant}>
                    <BadgeIndicator variant={status.variant} />
                    {t(status.key)}
                  </TableStatus>
                </TableCell>
                <TableCell>
                  {item.open && item.kind === 'suggestion' && <SuggestionActions suggestion={item} />}
                  {item.open && item.kind === 'notice' && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={read.isPending}
                        onClick={() =>
                          read.mutate({ id: item.id }, { onError: (error: Error) => toast.error(error.message) })
                        }
                      >
                        {t('mark_as_read')}
                      </Button>
                    </div>
                  )}
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
