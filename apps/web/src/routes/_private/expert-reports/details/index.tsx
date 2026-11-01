import { Button } from '@ethica/ui/components/button';
import { DropdownMenuItem } from '@ethica/ui/components/dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { FileSignature } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppLink } from '@/components/app-link.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LAUDO_STATUS_VARIANT, laudoStatusLabel } from '@/components/laudo-labels.js';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { RecordHeader, RecordHeading, RecordStatus } from '@/components/record.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseInspectionsQuery } from '@/query/inspection.js';
import {
  concluirLaudoMutation,
  deleteLaudoMutation,
  laudoQuery,
  removeLaudoSecaoMutation,
  updateLaudoSecaoMutation,
} from '@/query/laudo.js';
import { ConcluirLaudoDialog } from './@components/concluir-laudo-dialog.js';
import { LaudoSecaoEditor, type SectionDraft } from './@components/laudo-secao-editor.js';
import { LaudoSecoesNav } from './@components/laudo-secoes-nav.js';
import { type LaudoDetailsSearch, laudoDetailsSearchSchema } from './@interface/laudo-details.interface.js';

type Dialogo = 'concluir' | 'excluir' | 'remover-secao' | null;

export function LaudoDetailsPage() {
  const search = useSearch({ strict: false }) as LaudoDetailsSearch;
  const navigate = useNavigate({ from: '/expert-reports/details/' });
  const queryClient = useQueryClient();
  const query = useQuery({ ...laudoQuery(search.id), retry: false });
  const salvar = useMutation(updateLaudoSecaoMutation(queryClient));
  const removerSecao = useMutation(removeLaudoSecaoMutation(queryClient));
  const concluir = useMutation(concluirLaudoMutation(queryClient));
  const excluir = useMutation(deleteLaudoMutation(queryClient));
  const { download, pending } = useFileDownload();
  // Fotos das vistorias da perícia para o "Inserir foto" do editor (AD-129).
  const inspections = useQuery({ ...caseInspectionsQuery(query.data?.caseId ?? ''), enabled: Boolean(query.data) });
  const photos = (inspections.data ?? []).flatMap(({ appointment, inspection }) =>
    inspection.media
      .filter((media) => media.tipo === 'photo')
      .map((media) => ({ src: `/inspections/${appointment.id}/media/${media.id}`, caption: media.caption })),
  );
  const [draft, setDraft] = useState<(SectionDraft & { secaoId: string }) | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const laudo = query.data;
  const secao = laudo?.secoes.find((item) => item.id === search.secao) ?? laudo?.secoes[0];
  const atual =
    secao && draft?.secaoId === secao.id
      ? draft
      : secao && { secaoId: secao.id, titulo: secao.titulo, html: secao.html };
  const dirty = Boolean(secao && atual && (atual.titulo !== secao.titulo || atual.html !== secao.html));
  const onError = (error: Error) => toast.error(error.message);

  function salvarAtual(depois?: () => void) {
    if (!laudo || !secao || !atual || !dirty) return depois?.();
    salvar.mutate(
      { id: laudo.id, secaoId: secao.id, data: { titulo: atual.titulo, html: atual.html } },
      {
        onSuccess: () => {
          setDraft(null);
          depois?.();
        },
        onError,
      },
    );
  }

  // Trocar de seção salva antes a que estava aberta, para não perder texto.
  function selecionar(secaoId: string) {
    salvarAtual(() => navigate({ search: (prev: LaudoDetailsSearch) => ({ ...prev, secao: secaoId }), replace: true }));
  }

  function exportar(formato: 'pdf' | 'docx') {
    if (!laudo) return;
    salvarAtual(() => void download(`/expert-reports/${laudo.id}/${formato}`));
  }

  const openDraft = laudo?.status === 'draft';
  const menu = laudo && (
    <PageMenu>
      <DropdownMenuItem disabled={Boolean(pending)} onClick={() => exportar('pdf')}>
        {t('export_pdf')}
      </DropdownMenuItem>
      <DropdownMenuItem disabled={Boolean(pending)} onClick={() => exportar('docx')}>
        {t('export_word')}
      </DropdownMenuItem>
    </PageMenu>
  );

  return (
    <Card asPage>
      <CardHeader title={t('details')}>
        {laudo && (
          <CardAction>
            {openDraft && (
              <Button
                disabled={laudo.pendencias.length > 0 || dirty}
                title={laudo.pendencias.length ? t('fill_or_remove_variables') : undefined}
                onClick={() => setDialogo('concluir')}
              >
                {t('complete')}
              </Button>
            )}
            {menu}
          </CardAction>
        )}
      </CardHeader>
      {query.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !laudo || !secao || !atual ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <CardContent className="gap-8">
          <RecordHeader>
            <RecordHeading
              icon={<FileSignature />}
              label={`${t(laudo.tipo)} · ${laudo.modeloNome}`}
              title={laudo.caseNumber ?? t('expert_case_removed')}
              description={
                <AppLink to="/expert-cases/details" search={{ id: laudo.caseId }} as="description">
                  {t('open_expert_case')}
                </AppLink>
              }
            />
            <RecordStatus
              variant={LAUDO_STATUS_VARIANT[laudo.status]}
              label={laudoStatusLabel(laudo.status)}
              pulse={laudo.status === 'draft'}
            />
          </RecordHeader>
          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <LaudoSecoesNav laudo={laudo} selecionada={secao.id} onSelect={selecionar} />
            <LaudoSecaoEditor
              laudo={laudo}
              secao={secao}
              draft={atual}
              onChange={(next) => setDraft({ ...next, secaoId: secao.id })}
              dirty={dirty}
              saving={salvar.isPending || removerSecao.isPending}
              onSave={() => salvarAtual()}
              onRemove={() => setDialogo('remover-secao')}
              photos={photos}
            />
          </div>
        </CardContent>
      )}
      {laudo && openDraft && (
        <CardFooter className="justify-between gap-2">
          <Button variant="destructive" onClick={() => setDialogo('excluir')}>
            {t('remove')}
          </Button>
        </CardFooter>
      )}
      {laudo && dialogo === 'concluir' && (
        <ConcluirLaudoDialog
          pending={concluir.isPending}
          onClose={() => setDialogo(null)}
          onConfirm={(recordDelivery) =>
            concluir.mutate(
              { id: laudo.id, data: { recordDelivery } },
              {
                onSuccess: () => {
                  setDialogo(null);
                  toast.success(t('report_completed_successfully'));
                },
                onError,
              },
            )
          }
        />
      )}
      {laudo && secao && dialogo === 'remover-secao' && (
        <ConfirmDialog
          title={t('remove_section_question')}
          description={secao.titulo}
          confirmLabel={t('remove')}
          pending={removerSecao.isPending}
          onClose={() => setDialogo(null)}
          onConfirm={() =>
            removerSecao.mutate(
              { id: laudo.id, secaoId: secao.id },
              {
                onSuccess: () => {
                  setDialogo(null);
                  setDraft(null);
                  navigate({ search: (prev: LaudoDetailsSearch) => ({ ...prev, secao: undefined }), replace: true });
                },
                onError,
              },
            )
          }
        />
      )}
      {laudo && dialogo === 'excluir' && (
        <ConfirmDialog
          title={t('remove_report_question')}
          description={t('action_cannot_be_undone')}
          confirmLabel={t('remove')}
          pending={excluir.isPending}
          onClose={() => setDialogo(null)}
          onConfirm={() =>
            excluir.mutate({ id: laudo.id }, { onSuccess: () => navigate({ to: '/expert-reports/list' }), onError })
          }
        />
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/details/')({
  component: LaudoDetailsPage,
  staticData: { title: t('details') },
  validateSearch: (search: Record<string, unknown>): LaudoDetailsSearch => laudoDetailsSearchSchema.parse(search),
});
