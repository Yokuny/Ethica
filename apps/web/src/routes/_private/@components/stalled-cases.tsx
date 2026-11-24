import { caseLabel, STALLED_CASE_DAYS } from '@ethica/contracts';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Hourglass } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { StalledCases } from '@/query/case.js';

// "Stalled cases" block (GES-05): the oldest ones without movement and the way to the PDF.
export function StalledCasesList({ stalled }: { stalled: StalledCases }) {
  return (
    <div className="grid gap-3">
      <ItemGroup>
        {stalled.items.map((legalCase) => (
          <li key={legalCase.id}>
            <Item render={<Link to="/expert-cases/details" search={{ id: legalCase.id }} />}>
              <ItemMedia variant="icon">
                <Hourglass />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{caseLabel(legalCase)}</ItemTitle>
                <ItemDescription>{`${legalCase.stalledDays} ${t('days_without_movement')} · ${legalCase.subject}`}</ItemDescription>
              </ItemContent>
              <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Item>
          </li>
        ))}
      </ItemGroup>
      <AppLink to="/reports" as="description">
        {`${stalled.total} ${t('stalled_more_than')} ${STALLED_CASE_DAYS} ${t('days')} · ${t('stalled_report_pdf')}`}
      </AppLink>
    </div>
  );
}
