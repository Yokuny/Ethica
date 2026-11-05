import { caseLabel } from '@ethica/contracts';
import { useQuery } from '@tanstack/react-query';
import { Gavel } from 'lucide-react';
import { useState } from 'react';
import { caseRoleLabel } from '@/components/case-labels.js';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { casesQuery } from '@/query/case.js';

// Find the case by number or by parties: first step of a new report (LAU-02) and of a deadline in
// "Prazos e Alertas" (AD-189).
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
          <LinkList>
            {items.map((legalCase) => (
              <LinkListItem
                key={legalCase.id}
                icon={Gavel}
                render={<button type="button" className="w-full text-left" onClick={() => onPick(legalCase.id)} />}
                title={[legalCase.serviceOrder, caseLabel(legalCase)].filter(Boolean).join(' · ')}
                description={[
                  caseRoleLabel(legalCase.role, legalCase.roleName),
                  legalCase.division ?? legalCase.court,
                  legalCase.subject,
                ].join(' · ')}
              />
            ))}
          </LinkList>
        )}
      </DataTable>
    </Panel>
  );
}
