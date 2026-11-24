import { caseLabel } from '@ethica/contracts';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness } from 'lucide-react';
import { useState } from 'react';
import { caseRoleLabel } from '@/components/case-labels.js';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { casesQuery } from '@/query/case.js';

// Find the case by number or by parties: first step of a new report (LAU-02) and of a deadline in
// The Central (AD-189, AD-263).
export function CasePicker({ onPick }: { onPick: (caseId: string) => void }) {
  const [q, setQ] = useState('');
  const [input, setInput] = useDebouncedSearch(q, setQ);
  const query = useQuery(casesQuery({ q: q || undefined, limit: 8 }));
  const items = query.data?.items ?? [];

  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <div className="grid gap-1">
        <ItemTitle role="heading" aria-level={2} className="text-xs uppercase">
          {t('choose_expert_case')}
        </ItemTitle>
        <ItemDescription>{t('choose_expert_case_description')}</ItemDescription>
      </div>
      <DataTable search={{ value: input, onChange: setInput }}>
        {query.isLoading ? (
          <DefaultLoading />
        ) : !items.length ? (
          <DefaultEmptyData />
        ) : (
          <ItemGroup>
            {items.map((legalCase) => (
              <li key={legalCase.id}>
                <Item render={<button type="button" onClick={() => onPick(legalCase.id)} />}>
                  <ItemMedia variant="icon">
                    <BriefcaseBusiness />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{[legalCase.serviceOrder, caseLabel(legalCase)].filter(Boolean).join(' · ')}</ItemTitle>
                    <ItemDescription>
                      {[
                        caseRoleLabel(legalCase.role, legalCase.roleName),
                        legalCase.division ?? legalCase.court,
                        legalCase.subject,
                      ].join(' · ')}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </li>
            ))}
          </ItemGroup>
        )}
      </DataTable>
    </section>
  );
}
