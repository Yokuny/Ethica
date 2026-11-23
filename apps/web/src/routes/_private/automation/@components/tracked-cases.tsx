import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Gavel } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { trackedCasesQuery } from '@/query/automation.js';

// The services the worker follows in court (AD-277), each one linking to its detail.
export function TrackedCases() {
  const query = useQuery(trackedCasesQuery);
  const items = query.data ?? [];

  if (query.isLoading) return <DefaultLoading />;
  if (query.isError) return <DefaultEmptyData title={t('load_error')} />;
  if (!items.length) return <DefaultEmptyData title={t('no_tracked_cases')} />;
  return (
    <LinkList>
      {items.map((item) => (
        <LinkListItem
          key={item.caseId}
          icon={Gavel}
          title={item.caseLabel}
          description={`${item.court} · ${t('last_court_query')} ${formatDate(new Date(item.syncedAt))}`}
          render={<Link to="/expert-cases/details" search={{ id: item.caseId }} />}
        />
      ))}
    </LinkList>
  );
}
