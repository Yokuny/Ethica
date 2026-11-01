import { REPORT_DEFAULT_TEMPLATES, reportRoleType } from '@ethica/contracts';
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
import { createReportMutation, templateQuery, templatesQuery } from '@/query/report.js';
import { CasePicker } from './@components/case-picker.js';
import { type Escolhas, SectionsPicker } from './@components/sections-picker.js';
import { type ReportAddSearch, reportAddSearchSchema } from './@interface/report-add.interface.js';

// LAU-02: perícia → modelo do tipo certo (laudo ou parecer, LAU-06) → seções e variantes.
export function ReportAddPage() {
  const search = useSearch({ strict: false }) as ReportAddSearch;
  const navigate = useNavigate({ from: '/expert-reports/add/' });
  const queryClient = useQueryClient();
  const caseId = search.caseId ?? '';
  const legalCase = useQuery({ ...caseQuery(caseId), enabled: Boolean(caseId), retry: false });
  const tipo = legalCase.data ? reportRoleType(legalCase.data.role) : undefined;
  const templates = useQuery({ ...templatesQuery(tipo), enabled: Boolean(tipo) });
  const templateId = search.templateId ?? (tipo ? REPORT_DEFAULT_TEMPLATES[tipo] : '');
  const template = useQuery({ ...templateQuery(templateId), enabled: Boolean(templateId) });
  const create = useMutation(createReportMutation(queryClient));
  const [escolhas, setEscolhas] = useState<{ templateId: string; values: Escolhas } | null>(null);

  // Ao trocar de modelo, todas as seções começam marcadas na variante "sim".
  const atuais: Escolhas =
    escolhas?.templateId === templateId
      ? escolhas.values
      : Object.fromEntries((template.data?.sections ?? []).map((section) => [section.id, 'yes']));
  const escolhidas = Object.entries(atuais).filter((entry): entry is [string, 'yes' | 'no'] => Boolean(entry[1]));
  const parties = (side: 'plaintiff' | 'defendant') =>
    legalCase.data?.parties
      .filter((party) => party.side === side && party.tipo === 'party')
      .map((party) => party.nome)
      .join(', ');

  function updateSearch(patch: Partial<ReportAddSearch>) {
    navigate({ search: (prev: ReportAddSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handleCreate() {
    if (!legalCase.data || !escolhidas.length) return;
    create.mutate(
      {
        caseId: legalCase.data.id,
        templateId,
        sections: escolhidas.map(([id, variant]) => ({ id, variant })),
      },
      {
        onSuccess: (report) => navigate({ to: '/expert-reports/details', search: { id: report.id } }),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Card asPage>
      <CardHeader title={t('start_report')} />
      {!caseId ? (
        <CardContent className="max-w-4xl">
          <CasePicker onPick={(id) => updateSearch({ caseId: id, templateId: undefined })} />
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
                items={(templates.data ?? []).map((item) => ({ value: item.id, label: item.nome }))}
                value={templateId}
                onValueChange={(value) => value && updateSearch({ templateId: value })}
              >
                <SelectTrigger className="w-full sm:w-96" aria-label={t('template')}>
                  <SelectValue placeholder={t('choose_template')} />
                </SelectTrigger>
                <SelectContent>
                  {(templates.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Panel>
            {template.isLoading ? (
              <DefaultLoading />
            ) : template.data ? (
              <SectionsPicker
                sections={template.data.sections}
                escolhas={atuais}
                onChange={(values) => setEscolhas({ templateId, values })}
              />
            ) : null}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => updateSearch({ caseId: undefined, templateId: undefined })}>
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
  component: ReportAddPage,
  staticData: { title: t('start_report') },
  validateSearch: (search: Record<string, unknown>): ReportAddSearch => reportAddSearchSchema.parse(search),
});
