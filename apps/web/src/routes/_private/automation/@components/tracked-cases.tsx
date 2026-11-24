import { Badge } from '@ethica/ui/components/badge';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Gavel } from 'lucide-react';
import { useMemo } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import {
  TRACKED_CASE_VARIANT,
  type TrackedCaseState,
  trackedCaseDescription,
  trackedCaseLabel,
  trackedCaseState,
} from '@/components/tracked-case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { trackedCasesQuery } from '@/query/automation.js';

// What needs a look first (not found, no answer), then what waits for the first query, then the synced ones.
const RANK: Record<TrackedCaseState, number> = { not_found: 0, stale: 0, waiting: 1, synced: 2 };

// Every service the worker follows in court (PAC-01), with its situation (PAC-02), each one linking to its detail.
export function TrackedCases() {
  const query = useQuery(trackedCasesQuery);
  const items = useMemo(() => {
    const now = Date.now();
    return (query.data ?? [])
      .map((item) => ({ ...item, state: trackedCaseState(item, now) }))
      .sort(
        (a, b) =>
          RANK[a.state] - RANK[b.state] ||
          (b.syncedAt ?? '').localeCompare(a.syncedAt ?? '') ||
          a.caseLabel.localeCompare(b.caseLabel),
      );
  }, [query.data]);

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
          badges={<Badge variant={TRACKED_CASE_VARIANT[item.state]}>{trackedCaseLabel(item.state)}</Badge>}
          description={`${item.court} · ${trackedCaseDescription(item, item.state)}`}
          render={<Link to="/expert-cases/details" search={{ id: item.caseId }} />}
        />
      ))}
    </LinkList>
  );
}
