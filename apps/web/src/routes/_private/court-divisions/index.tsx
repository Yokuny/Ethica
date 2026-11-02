import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { FileUp, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type CourtDivisionRecord, courtDivisionsQuery, deleteCourtDivisionMutation } from '@/query/court-division.js';
import { can, sessionQuery } from '@/query/session.js';
import { CourtDivisionCard } from './@components/court-division-card.js';
import { CourtDivisionForm } from './@components/court-division-form.js';
import { CourtDivisionsFilters } from './@components/court-divisions-filters.js';
import { CourtDivisionsImportDialog } from './@components/court-divisions-import-dialog.js';
import { type CourtDivisionsSearch, courtDivisionsSearchSchema } from './@interface/court-divisions.interface.js';

// Name compared without case and accents, on the list already filtered by state and city (AD-151).
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

type Dialog =
  | { kind: 'form'; division?: CourtDivisionRecord }
  | { kind: 'remove'; division: CourtDivisionRecord }
  | { kind: 'import' };

// Contact book of court divisions (VAR-01): filter state and city and see the contacts.
export function CourtDivisionsPage() {
  const search = useSearch({ strict: false }) as CourtDivisionsSearch;
  const navigate = useNavigate({ from: '/court-divisions/' });
  const queryClient = useQueryClient();
  const session = useQuery(sessionQuery).data;
  const query = useQuery(courtDivisionsQuery({ state: search.state, city: search.city, courtType: search.courtType }));
  const removal = useMutation(deleteCourtDivisionMutation(queryClient));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const canCreate = Boolean(session && can(session, 'court_divisions', 'create'));
  const canUpdate = Boolean(session && can(session, 'court_divisions', 'update'));
  const canDelete = Boolean(session && can(session, 'court_divisions', 'delete'));
  const filtering = Boolean(search.state || search.city || search.courtType || search.q);
  const items = (query.data ?? []).filter((item) => !search.q || normalize(item.name).includes(normalize(search.q)));

  function update(patch: Partial<CourtDivisionsSearch>) {
    navigate({ search: (prev: CourtDivisionsSearch) => ({ ...prev, ...patch }), replace: true });
  }

  return (
    <Card asPage>
      <CardHeader title={t('court_divisions')} description={t('court_divisions_page_description')}>
        {canCreate && (
          <CardAction>
            <Button variant="outline" onClick={() => setDialog({ kind: 'import' })}>
              <FileUp />
              {t('import_spreadsheet')}
            </Button>
            <Button onClick={() => setDialog({ kind: 'form' })}>{t('add')}</Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="gap-6">
        <CourtDivisionsFilters search={search} onChange={update} />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label={t('search_by_name')}
            placeholder={t('search_by_name')}
            value={search.q}
            onChange={(event) => update({ q: event.target.value })}
          />
        </div>
        {query.isLoading ? (
          <DefaultLoading />
        ) : query.isError ? (
          <DefaultEmptyData
            title={t('load_error')}
            action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
          />
        ) : !items.length ? (
          <DefaultEmptyData
            title={filtering ? t('no_records_match_filters') : t('no_court_divisions_yet')}
            description={filtering ? undefined : t('no_court_divisions_yet_description')}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((division) => (
              <CourtDivisionCard
                key={division.id}
                division={division}
                onEdit={canUpdate ? () => setDialog({ kind: 'form', division }) : undefined}
                onRemove={canDelete ? () => setDialog({ kind: 'remove', division }) : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
      {dialog?.kind === 'form' && <CourtDivisionForm division={dialog.division} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'import' && <CourtDivisionsImportDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'remove' && (
        <ConfirmDialog
          title={t('remove_court_division_question')}
          description={dialog.division.name}
          confirmLabel={t('remove')}
          pending={removal.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            removal.mutate(
              { id: dialog.division.id },
              { onSuccess: () => setDialog(null), onError: (error) => toast.error(error.message) },
            )
          }
        />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/court-divisions/')({
  component: CourtDivisionsPage,
  staticData: { title: t('court_divisions') },
  validateSearch: (search: Record<string, unknown>): CourtDivisionsSearch => courtDivisionsSearchSchema.parse(search),
});
