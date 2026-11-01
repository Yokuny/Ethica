import { Badge } from '@ethica/ui/components/badge';
import { Link } from '@tanstack/react-router';
import { CalendarClock } from 'lucide-react';
import { COMPROMISSO_TIPO_VARIANT } from '@/components/compromisso-labels.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CompromissoRecord } from '@/query/compromisso.js';

// Próximos compromissos; cada linha abre a agenda no dia dele.
export function UpcomingCompromissos({ items }: { items: CompromissoRecord[] }) {
  return (
    <LinkList>
      {items.map((item) => (
        <LinkListItem
          key={item.id}
          icon={CalendarClock}
          render={<Link to="/agenda" search={{ date: formatDisplayDate(item.inicio), view: 'day' }} />}
          title={item.titulo}
          badges={<Badge variant={COMPROMISSO_TIPO_VARIANT[item.tipo]}>{t(item.tipo)}</Badge>}
          description={[formatDateTime(item.inicio), item.caseNumber, item.local].filter(Boolean).join(' · ')}
        />
      ))}
    </LinkList>
  );
}
