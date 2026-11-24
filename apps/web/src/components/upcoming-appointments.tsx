import { Badge } from '@ethica/ui/components/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, CalendarClock } from 'lucide-react';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';

// Upcoming appointments; each row opens the agenda on its day.
export function UpcomingAppointments({ items }: { items: AppointmentRecord[] }) {
  return (
    <ItemGroup>
      {items.map((item) => (
        <li key={item.id}>
          <Item render={<Link to="/agenda" search={{ date: formatDisplayDate(item.start), view: 'day' }} />}>
            <ItemMedia variant="icon">
              <CalendarClock />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <ItemTitle className="font-normal tabular-nums">{formatDateTime(item.start)}</ItemTitle>
                <ItemDescription>{[item.caseNumber, item.location].filter(Boolean).join(' · ')}</ItemDescription>
              </div>
            </ItemContent>
            <ItemActions>
              <Badge variant={APPOINTMENT_TYPE_VARIANT[item.type]}>{t(item.type)}</Badge>
            </ItemActions>
            <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Item>
        </li>
      ))}
    </ItemGroup>
  );
}
