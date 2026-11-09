import { caseArea, caseLabel, defaultTemplateOf, reportRoleType } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useBlocker, useNavigate, useSearch } from '@tanstack/react-router';
import { Gavel } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { CasePicker } from '@/components/case-picker.js';
import { ConfirmDialog } from '@/components/confirm-dialog.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { RecordHeader, RecordHeading } from '@/components/record.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseQuery } from '@/query/case.js';
import { createReportMutation, templateQuery } from '@/query/report.js';
import { type Choices, SectionsPicker } from '../@components/sections-picker.js';
import { TemplateSelect } from '../@components/template-select.js';
import { ServiceOrderField } from './@components/service-order-field.js';
import { ACCOUNT_OWNER, SignatoryPicker } from './@components/signatory-picker.js';
import { type ReportAddSearch, reportAddSearchSchema } from './@interface/report-add.interface.js';

// LAU-02: case → template of the right type (report or opinion, LAU-06) → sections and variants.
export function ReportAddPage() {
  const search = useSearch({ strict: false }) as ReportAddSearch;
  const navigate = useNavigate({ from: '/expert-reports/add/' });
  const queryClient = useQueryClient();
  const caseId = search.caseId ?? '';
  const legalCase = useQuery({ ...caseQuery(caseId), enabled: Boolean(caseId), retry: false });
  const type = legalCase.data ? reportRoleType(legalCase.data.role) : undefined;
  const templateId = search.templateId ?? (type ? defaultTemplateOf(type) : '');
  const template = useQuery({ ...templateQuery(templateId), enabled: Boolean(templateId) });
  const create = useMutation(createReportMutation(queryClient));
  const [choices, setChoices] = useState<{ templateId: string; values: Choices } | null>(null);
  const [signatory, setSignatory] = useState(ACCOUNT_OWNER);
  // The draft was created: leaving the page no longer asks.
  const saved = useRef(false);
  // Started = a case chosen. Leaving for another page asks whether to save it as a draft first;
  // changing the case or template stays on the page and does not ask.
  const leave = useBlocker({
    shouldBlockFn: ({ current, next }) => !saved.current && current.pathname !== next.pathname,
    disabled: !legalCase.data,
    withResolver: true,
  });

  // When switching templates, every section starts checked on the "yes" variant.
  const current: Choices =
    choices && choices.templateId === templateId
      ? choices.values
      : Object.fromEntries((template.data?.sections ?? []).map((section) => [section.id, 'yes']));
  const chosen = Object.entries(current).filter((entry): entry is [string, 'yes' | 'no'] => Boolean(entry[1]));
  const parties = (side: 'plaintiff' | 'defendant') =>
    legalCase.data?.parties
      .filter((party) => party.side === side && party.type === 'party')
      .map((party) => party.name)
      .join(', ');

  function updateSearch(patch: Partial<ReportAddSearch>) {
    navigate({ search: (prev: ReportAddSearch) => ({ ...prev, ...patch }), replace: true });
  }

  // `then` of the confirmation: by default opens the new draft; when leaving, goes where the user was going.
  function handleCreate(then?: () => void) {
    if (!legalCase.data || !chosen.length) return;
    create.mutate(
      {
        caseId: legalCase.data.id,
        ...(signatory === ACCOUNT_OWNER ? {} : { signatoryId: signatory }),
        templateId,
        sections: chosen.map(([id, variant]) => ({ id, variant })),
      },
      {
        onSuccess: (report) => {
          saved.current = true;
          if (then) then();
          else navigate({ to: '/expert-reports/details', search: { id: report.id } });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Card asPage>
      {leave.status === 'blocked' && (
        <ConfirmDialog
          title={t('save_draft_question')}
          description={t('save_draft_question_description')}
          confirmLabel={t('save_draft')}
          variant="default"
          pending={create.isPending}
          errorMessage={create.error?.message}
          onConfirm={() => (chosen.length ? handleCreate(leave.proceed) : leave.proceed())}
          onClose={leave.reset}
        >
          <Button variant="ghost" className="self-start" disabled={create.isPending} onClick={leave.proceed}>
            {t('discard_and_leave')}
          </Button>
        </ConfirmDialog>
      )}
      <CardHeader title={t('new_report')} />
      {!caseId ? (
        <CardContent className="max-w-4xl">
          <CasePicker onPick={(id) => updateSearch({ caseId: id, templateId: undefined })} />
        </CardContent>
      ) : legalCase.isLoading ? (
        <CardContent>
          <DefaultLoading />
        </CardContent>
      ) : !legalCase.data || !type ? (
        <CardContent>
          <DefaultEmptyData title={t('not_found')} />
        </CardContent>
      ) : (
        <>
          <CardContent className="max-w-4xl gap-8">
            <RecordHeader>
              <RecordHeading
                icon={<Gavel />}
                label={t(template.data?.type ?? type)}
                title={caseLabel(legalCase.data)}
                description={[
                  legalCase.data.division ?? legalCase.data.court,
                  parties('plaintiff') && `${parties('plaintiff')} × ${parties('defendant') || '—'}`,
                  legalCase.data.subject,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </RecordHeader>
            <Panel title={t('linked_service_order')} description={t('linked_service_order_description')}>
              <ServiceOrderField legalCase={legalCase.data} />
            </Panel>
            <Panel title={t('technical_responsible')} description={t('technical_responsible_description')}>
              <SignatoryPicker value={signatory} onChange={setSignatory} />
            </Panel>
            <Panel title={t('template')} description={t('choose_template_description')}>
              <TemplateSelect
                area={legalCase.data && caseArea(legalCase.data)}
                value={templateId}
                onChange={(value) => updateSearch({ templateId: value })}
              />
            </Panel>
            {template.isLoading ? (
              <DefaultLoading />
            ) : template.data ? (
              <SectionsPicker
                sections={template.data.sections}
                choices={current}
                onChange={(values) => setChoices({ templateId, values })}
              />
            ) : null}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => updateSearch({ caseId: undefined, templateId: undefined })}>
              {t('change_expert_case')}
            </Button>
            <Button disabled={!chosen.length || create.isPending} onClick={() => handleCreate()}>
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
  staticData: { title: t('new_report') },
  validateSearch: (search: Record<string, unknown>): ReportAddSearch => reportAddSearchSchema.parse(search),
});
