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
import { periciaQuery } from '@/query/pericia.js';
import { canSeeFinance, isAdminSession, sessionQuery } from '@/query/session.js';
import { PericiaDetailsView } from './@components/pericia-details-view.js';
import { PericiaEditForm } from './@components/pericia-edit-form.js';
import { PericiaMovimentacoes } from './@components/pericia-movimentacoes.js';
import { PericiaPrazos } from './@components/pericia-prazos.js';
import { PericiaRelated } from './@components/pericia-related.js';
import { usePericiaActions } from './@hooks/use-pericia-actions.js';
import { type PericiaDetailsSearch, periciaDetailsSearchSchema } from './@interface/pericia-details.interface.js';

export function PericiaDetailsPage() {
  const search = useSearch({ strict: false }) as PericiaDetailsSearch;
  const { data: session } = useSuspenseQuery(sessionQuery);
  const query = useQuery({ ...periciaQuery(search.id), retry: false });
  const pericia = query.data;
  const { handleDelete, isDeleting, isConfirmingDelete, askDelete, cancelDelete } = usePericiaActions(pericia);
  const [isEditing, setIsEditing] = useState(false);
  const { download, pending } = useFileDownload();
  // DOC-02: ficha e checklist em PDF; a ficha só traz valores para admin/manager (a API decide).
  const documentsMenu = pericia && (
    <PageMenu>
      <DropdownMenuItem
        disabled={Boolean(pending)}
        onClick={() => download(`/documentos/pericias/${pericia.id}/ficha`)}
      >
        {t('expert_case_sheet_pdf')}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={Boolean(pending)}
        onClick={() => download(`/documentos/pericias/${pericia.id}/checklist`)}
      >
        {t('field_checklist_pdf')}
      </DropdownMenuItem>
    </PageMenu>
  );
  const editAction = (
    <Button variant="outline" onClick={() => setIsEditing(true)}>
      {t('edit')}
    </Button>
  );
  const deleteAction = isAdminSession(session) && (
    <Button variant="destructive" disabled={isDeleting} onClick={askDelete}>
      {t('remove')}
    </Button>
  );

  return (
    <Card asPage>
      {!isEditing && (
        <CardHeader title={t('details')}>
          {pericia && (
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
      ) : !pericia ? (
        // id inexistente ou de outro tenant: a API responde 404 (a consulta é escopada ao tenant).
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : isEditing ? (
        <PericiaEditForm pericia={pericia} onSaved={() => setIsEditing(false)} onCancel={() => setIsEditing(false)} />
      ) : (
        <CardContent className="gap-10">
          <PericiaDetailsView pericia={pericia} />
          <PericiaPrazos periciaId={pericia.id} />
          <PericiaMovimentacoes pericia={pericia} />
          <PericiaRelated periciaId={pericia.id} canSeeFinance={canSeeFinance(session)} />
        </CardContent>
      )}
      {pericia && !isEditing && (
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

export const Route = createFileRoute('/_private/pericias/details/')({
  component: PericiaDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): PericiaDetailsSearch => periciaDetailsSearchSchema.parse(search),
});
