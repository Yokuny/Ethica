import { caseLabel } from '@ethica/contracts';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { caseRoleLabel } from '@/components/case-labels.js';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Panel } from '@/components/panel.js';
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
    <Panel title={t('choose_expert_case')} description={t('choose_expert_case_description')}>
      <DataTable search={{ value: input, onChange: setInput }}>
        {query.isLoading ? (
          <DefaultLoading />
        ) : !items.length ? (
          <DefaultEmptyData />
        ) : (
          <ItemGroup variant="list">
            {items.map((legalCase) => (
              <li key={legalCase.id}>
                <Item render={<button type="button" onClick={() => onPick(legalCase.id)} />}>
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
    </Panel>
  );
}
