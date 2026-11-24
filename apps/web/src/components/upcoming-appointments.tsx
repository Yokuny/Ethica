import { Badge } from '@ethica/ui/components/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';

// Upcoming appointments; each row opens the agenda on its day.
export function UpcomingAppointments({ items }: { items: AppointmentRecord[] }) {
  return (
    <ItemGroup variant="list">
      {items.map((item) => (
        <li key={item.id}>
          <Item render={<Link to="/agenda" search={{ date: formatDisplayDate(item.start), view: 'day' }} />}>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              <ItemDescription>
                {[formatDateTime(item.start), item.caseNumber, item.location].filter(Boolean).join(' · ')}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant={APPOINTMENT_TYPE_VARIANT[item.type]}>{t(item.type)}</Badge>
            </ItemActions>
          </Item>
        </li>
      ))}
    </ItemGroup>
  );
}
