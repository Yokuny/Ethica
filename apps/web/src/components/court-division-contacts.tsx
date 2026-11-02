import { ItemDescription } from '@ethica/ui/components/item';
import { Globe, Mail, MapPin, Phone, StickyNote } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CourtDivisionRecord } from '@/query/court-division.js';

type Row = { key: string; icon: ReactNode; content: ReactNode };

// Contact lines of a court division (AD-151): phone, e-mail and virtual desk open the app/site.
export function CourtDivisionContacts({ division }: { division: CourtDivisionRecord }) {
  const rows = (
    [
      division.phones && {
        key: 'phones',
        icon: <Phone />,
        content: <a href={`tel:${division.phones.split('/')[0]?.replace(/[^\d+]/g, '')}`}>{division.phones}</a>,
      },
      division.email && {
        key: 'email',
        icon: <Mail />,
        content: <a href={`mailto:${division.email}`}>{division.email}</a>,
      },
      division.virtualDesk && {
        key: 'virtualDesk',
        icon: <Globe />,
        content: (
          <a href={division.virtualDesk} target="_blank" rel="noreferrer">
            {t('virtual_desk')}
          </a>
        ),
      },
      division.address && { key: 'address', icon: <MapPin />, content: division.address },
      division.notes && { key: 'notes', icon: <StickyNote />, content: division.notes },
    ] as Array<Row | '' | undefined>
  ).filter((row): row is Row => Boolean(row));

  if (!rows.length) return <ItemDescription>{t('no_contact_registered')}</ItemDescription>;
  return (
    <ul className="grid gap-1.5">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-start gap-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
        >
          {row.icon}
          <ItemDescription className="line-clamp-none">{row.content}</ItemDescription>
        </li>
      ))}
    </ul>
  );
}
