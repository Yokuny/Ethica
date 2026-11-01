import type { ColumnDef } from '@tanstack/react-table';
import { AppLink } from '@/components/app-link.js';
import { TableStack } from '@/components/data-table.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import {
  ACTIVITY_LOG_ACTION_KEY,
  ACTIVITY_LOG_MODULE_KEY,
  ACTIVITY_LOG_RESOURCE_KEY,
} from '../@consts/activity-log-labels.js';
import type { Activity } from '../@query/activityLog.js';

// Modules with a detail screen: the record becomes a link while it exists.
const DETAIL = {
  expert_cases: '/expert-cases/details',
  parties: '/parties/details',
  expert_reports: '/expert-reports/details',
  report_templates: '/expert-reports/templates/details',
} as const;

function FieldRecord({ activity }: { activity: Activity }) {
  const text = activity.label ?? (activity.recordId ? t('record') : '—');
  const destination = activity.module in DETAIL ? DETAIL[activity.module as keyof typeof DETAIL] : undefined;
  if (!destination || !activity.recordId) return <TableStack>{text}</TableStack>;
  return (
    <AppLink to={destination} search={{ id: activity.recordId }}>
      {text}
    </AppLink>
  );
}

export const activityLogColumns: ColumnDef<Activity, unknown>[] = [
  {
    id: 'quando',
    header: t('when'),
    cell: ({ row }) => <TableStack>{formatDateTime(row.original.createdAt)}</TableStack>,
  },
  { id: 'quem', header: t('user'), cell: ({ row }) => <TableStack>{row.original.userName}</TableStack> },
  {
    id: 'action',
    header: t('action'),
    cell: ({ row }) => (
      <TableStack
        description={
          row.original.resource && ACTIVITY_LOG_RESOURCE_KEY[row.original.resource]
            ? t(ACTIVITY_LOG_RESOURCE_KEY[row.original.resource])
            : undefined
        }
      >
        {`${t(ACTIVITY_LOG_MODULE_KEY[row.original.module])} · ${t(ACTIVITY_LOG_ACTION_KEY[row.original.action])}`}
      </TableStack>
    ),
  },
  { id: 'record', header: t('record'), cell: ({ row }) => <FieldRecord activity={row.original} /> },
];
