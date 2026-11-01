import { LAUDO_MODELOS_PADRAO, reportRoleType } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { Gavel } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseQuery } from '@/query/case.js';
import { createLaudoMutation, modeloQuery, modelosQuery } from '@/query/laudo.js';
import { CasePicker } from './@components/case-picker.js';
import { type Escolhas, SecoesPicker } from './@components/secoes-picker.js';
import { type LaudoAddSearch, laudoAddSearchSchema } from './@interface/laudo-add.interface.js';

// LAU-02: perícia → modelo do tipo certo (laudo ou parecer, LAU-06) → seções e variantes.
export function LaudoAddPage() {
  const search = useSearch({ strict: false }) as LaudoAddSearch;
  const navigate = useNavigate({ from: '/expert-reports/add/' });
  const queryClient = useQueryClient();
  const caseId = search.caseId ?? '';
  const legalCase = useQuery({ ...caseQuery(caseId), enabled: Boolean(caseId), retry: false });
  const tipo = legalCase.data ? reportRoleType(legalCase.data.role) : undefined;
  const modelos = useQuery({ ...modelosQuery(tipo), enabled: Boolean(tipo) });
  const modeloId = search.modeloId ?? (tipo ? LAUDO_MODELOS_PADRAO[tipo] : '');
  const modelo = useQuery({ ...modeloQuery(modeloId), enabled: Boolean(modeloId) });
  const create = useMutation(createLaudoMutation(queryClient));
  const [escolhas, setEscolhas] = useState<{ modeloId: string; values: Escolhas } | null>(null);

  // Ao trocar de modelo, todas as seções começam marcadas na variante "sim".
  const atuais: Escolhas =
    escolhas?.modeloId === modeloId
      ? escolhas.values
      : Object.fromEntries((modelo.data?.secoes ?? []).map((secao) => [secao.id, 'yes']));
  const escolhidas = Object.entries(atuais).filter((entry): entry is [string, 'yes' | 'no'] => Boolean(entry[1]));
  const parties = (side: 'plaintiff' | 'defendant') =>
    legalCase.data?.parties
      .filter((party) => party.side === side && party.tipo === 'party')
      .map((party) => party.nome)
      .join(', ');

  function updateSearch(patch: Partial<LaudoAddSearch>) {
    navigate({ search: (prev: LaudoAddSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handleCreate() {
    if (!legalCase.data || !escolhidas.length) return;
    create.mutate(
      {
        caseId: legalCase.data.id,
        modeloId,
        secoes: escolhidas.map(([id, variante]) => ({ id, variante })),
      },
      {
        onSuccess: (laudo) => navigate({ to: '/expert-reports/details', search: { id: laudo.id } }),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Card asPage>
      <CardHeader title={t('start_report')} />
      {!caseId ? (
        <CardContent className="max-w-4xl">
          <CasePicker onPick={(id) => updateSearch({ caseId: id, modeloId: undefined })} />
        </CardContent>
      ) : legalCase.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !legalCase.data || !tipo ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <>
          <CardContent className="max-w-4xl gap-8">
            <RecordHeader>
              <RecordHeading
                icon={<Gavel />}
                label={t(tipo)}
                title={legalCase.data.processNumber}
                description={[
                  legalCase.data.division ?? legalCase.data.court,
                  parties('plaintiff') && `${parties('plaintiff')} × ${parties('defendant') || '—'}`,
                  legalCase.data.subject,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </RecordHeader>
            <Panel title={t('template')} description={t('choose_template_description')}>
              <Select
                items={(modelos.data ?? []).map((item) => ({ value: item.id, label: item.nome }))}
                value={modeloId}
                onValueChange={(value) => value && updateSearch({ modeloId: value })}
              >
                <SelectTrigger className="w-full sm:w-96" aria-label={t('template')}>
                  <SelectValue placeholder={t('choose_template')} />
                </SelectTrigger>
                <SelectContent>
                  {(modelos.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Panel>
            {modelo.isLoading ? (
              <DefaultLoading />
            ) : modelo.data ? (
              <SecoesPicker
                secoes={modelo.data.secoes}
                escolhas={atuais}
                onChange={(values) => setEscolhas({ modeloId, values })}
              />
            ) : null}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => updateSearch({ caseId: undefined, modeloId: undefined })}>
              {t('change_expert_case')}
            </Button>
            <Button disabled={!escolhidas.length || create.isPending} onClick={handleCreate}>
              {t('create_draft')}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/add/')({
  component: LaudoAddPage,
  staticData: { title: t('start_report') },
  validateSearch: (search: Record<string, unknown>): LaudoAddSearch => laudoAddSearchSchema.parse(search),
});
