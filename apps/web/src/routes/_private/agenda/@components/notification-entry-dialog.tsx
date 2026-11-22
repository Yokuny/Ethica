import { useQuery } from '@tanstack/react-query';
import { CaseReceipts } from '@/components/case-receipts.js';
import { NotificationDialog } from '@/components/notification-dialog.js';
import type { CalendarEntryRecord } from '@/query/calendar-entry.js';
import { caseNotificationsQuery } from '@/query/notification.js';

// A deadline entry of the agenda (AD-169) opens the deadline itself, read from its case, with the
// day-to-day actions (file, missed, reopen) and the case receipts.
export function NotificationEntryDialog({ entry, onClose }: { entry: CalendarEntryRecord; onClose: () => void }) {
  const caseId = entry.caseId ?? '';
  const { data } = useQuery({ ...caseNotificationsQuery(caseId), enabled: Boolean(caseId) });
  const deadline = data?.find((item) => item.id === entry.originId);
  if (!deadline) return null;
  return (
    <NotificationDialog deadline={{ ...deadline, caseNumber: entry.caseNumber }} onClose={onClose}>
      <CaseReceipts caseId={deadline.caseId} />
    </NotificationDialog>
  );
}
