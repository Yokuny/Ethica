import { STALLED_CASE_DAYS } from '@ethica/contracts';
import { Link } from '@tanstack/react-router';
import { Hourglass } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { StalledCases } from '@/query/case.js';

// "Stalled cases" block (GES-05): the oldest ones without movement and the way to the PDF.
export function StalledCasesList({ stalled }: { stalled: StalledCases }) {
  return (
    <div className="grid gap-3">
      <LinkList>
        {stalled.items.map((legalCase) => (
          <LinkListItem
            key={legalCase.id}
            render={<Link to="/expert-cases/details" search={{ id: legalCase.id }} />}
            icon={Hourglass}
            title={legalCase.processNumber}
            description={`${legalCase.stalledDays} ${t('days_without_movement')} · ${legalCase.subject}`}
          />
        ))}
      </LinkList>
      <AppLink to="/reports" as="description">
        {`${stalled.total} ${t('stalled_more_than')} ${STALLED_CASE_DAYS} ${t('days')} · ${t('stalled_report_pdf')}`}
      </AppLink>
    </div>
  );
}
