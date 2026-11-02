import { Button } from '@ethica/ui/components/button';
import { DropdownMenuItem } from '@ethica/ui/components/dropdown-menu';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseQuery } from '@/query/case.js';
import { can, sessionQuery } from '@/query/session.js';
import { CaseCourtDivision } from './@components/case-court-division.js';
import { CaseDeadlines } from './@components/case-deadlines.js';
import { CaseDetailsView } from './@components/case-details-view.js';
import { CaseEditForm } from './@components/case-edit-form.js';
import { CaseInspections } from './@components/case-inspections.js';
import { CaseMovements } from './@components/case-movements.js';
import { CaseRelated } from './@components/case-related.js';
import { CaseReports } from './@components/case-reports.js';
import { useCaseActions } from './@hooks/use-case-actions.js';
import { type CaseDetailsSearch, caseDetailsSearchSchema } from './@interface/case-details.interface.js';

export function CaseDetailsPage() {
  const search = useSearch({ strict: false }) as CaseDetailsSearch;
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery({ ...caseQuery(search.id), retry: false });
  const legalCase = query.data;
  const { handleDelete, isDeleting, isConfirmingDelete, askDelete, cancelDelete } = useCaseActions(legalCase);
  const [isEditing, setIsEditing] = useState(false);
  const { download, pending } = useFileDownload();
  // DOC-02: sheet and checklist as PDF; the sheet only carries amounts for admin/manager (the API decides).
  const documentsMenu = legalCase && (
    <PageMenu>
      <DropdownMenuItem
        disabled={Boolean(pending)}
        onClick={() => download(`/documents/expert-cases/${legalCase.id}/sheet`)}
      >
        {t('expert_case_sheet_pdf')}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={Boolean(pending)}
        onClick={() => download(`/documents/expert-cases/${legalCase.id}/checklist`)}
      >
        {t('field_checklist_pdf')}
      </DropdownMenuItem>
    </PageMenu>
  );
  const editAction = can(session, 'expert_cases', 'update') && (
    <Button variant="outline" onClick={() => setIsEditing(true)}>
      {t('edit')}
    </Button>
  );
  const deleteAction = can(session, 'expert_cases', 'delete') && (
    <Button variant="destructive" disabled={isDeleting} onClick={askDelete}>
      {t('remove')}
    </Button>
  );

  return (
    <Card asPage>
      {!isEditing && (
        <CardHeader title={t('details')}>
          {legalCase && (
            <CardAction>
              {editAction}
              {documentsMenu}
            </CardAction>
          )}
        </CardHeader>
      )}
      {query.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !legalCase ? (
        // Missing id or from another tenant: the API answers 404 (the query is scoped to the tenant).
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : isEditing ? (
        <CaseEditForm legalCase={legalCase} onSaved={() => setIsEditing(false)} onCancel={() => setIsEditing(false)} />
      ) : (
        <CardContent className="gap-10">
          <CaseDetailsView legalCase={legalCase} canSeeFinance={can(session, 'finance')} />
          {can(session, 'court_divisions') && <CaseCourtDivision legalCase={legalCase} />}
          <CaseDeadlines caseId={legalCase.id} />
          <CaseInspections caseId={legalCase.id} />
          <CaseReports legalCase={legalCase} />
          <CaseMovements legalCase={legalCase} />
          <CaseRelated caseId={legalCase.id} canSeeFinance={can(session, 'finance')} />
        </CardContent>
      )}
      {legalCase && !isEditing && (
        <CardFooter className="justify-between gap-2">
          <CardAction>{deleteAction}</CardAction>
          <CardAction>{editAction}</CardAction>
        </CardFooter>
      )}
      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('remove_expert_case_question')}
          description={t('action_cannot_be_undone')}
          confirmLabel={t('remove')}
          pending={isDeleting}
          onConfirm={handleDelete}
          onClose={cancelDelete}
        />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-cases/details/')({
  component: CaseDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): CaseDetailsSearch => caseDetailsSearchSchema.parse(search),
});
