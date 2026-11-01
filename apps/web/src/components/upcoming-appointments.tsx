import { Badge } from '@ethica/ui/components/badge';
import { Link } from '@tanstack/react-router';
import { CalendarClock } from 'lucide-react';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';

// Próximos compromissos; cada linha abre a agenda no dia dele.
export function UpcomingAppointments({ items }: { items: AppointmentRecord[] }) {
  return (
    <LinkList>
      {items.map((item) => (
        <LinkListItem
          key={item.id}
          icon={CalendarClock}
          render={<Link to="/agenda" search={{ date: formatDisplayDate(item.start), view: 'day' }} />}
          title={item.title}
          badges={<Badge variant={APPOINTMENT_TYPE_VARIANT[item.type]}>{t(item.type)}</Badge>}
          description={[formatDateTime(item.start), item.caseNumber, item.location].filter(Boolean).join(' · ')}
        />
      ))}
    </LinkList>
  );
}
