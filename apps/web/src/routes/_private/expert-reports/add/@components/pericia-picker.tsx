import { useQuery } from '@tanstack/react-query';
import { Gavel } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { periciasQuery } from '@/query/pericia.js';

// Primeiro passo de LAU-02: achar a perícia pelo número ou pelas partes.
export function PericiaPicker({ onPick }: { onPick: (periciaId: string) => void }) {
  const [q, setQ] = useState('');
  const [input, setInput] = useDebouncedSearch(q, setQ);
  const query = useQuery(periciasQuery({ q: q || undefined, limit: 8 }));
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
            {items.map((pericia) => (
              <LinkListItem
                key={pericia.id}
                icon={Gavel}
                render={<button type="button" className="w-full text-left" onClick={() => onPick(pericia.id)} />}
                title={pericia.numeroProcesso}
                description={[t(pericia.papel), pericia.vara ?? pericia.tribunal, pericia.objeto].join(' · ')}
              />
            ))}
          </LinkList>
        )}
      </DataTable>
    </Panel>
  );
}
