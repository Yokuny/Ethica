import { Button } from '@ethica/ui/components/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { DefaultLoading } from '@/components/default-loading.js';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { chooseReportSectionsMutation, type ReportRecord, templateQuery } from '@/query/report.js';
import { type Choices, SectionsPicker } from '../../@components/sections-picker.js';
import { TemplateSelect } from '../../@components/template-select.js';

// LMO-01: check and uncheck the template sections in the draft, or change the template. A section that
// stays checked in the same variant keeps the edited text; changing the template starts over.
export function ReportSectionsDialog({ report, onClose }: { report: ReportRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const choose = useMutation(chooseReportSectionsMutation(queryClient));
  const [templateId, setTemplateId] = useState(report.templateId ?? '');
  const [choices, setChoices] = useState<{ templateId: string; values: Choices } | null>(null);
  const template = useQuery({ ...templateQuery(templateId), enabled: Boolean(templateId) });
  const current: Choices =
    choices?.templateId === templateId
      ? choices.values
      : templateId === report.templateId
        ? Object.fromEntries(
            report.sections.flatMap((s) => (s.templateSectionId ? [[s.templateSectionId, s.variant]] : [])),
          )
        : Object.fromEntries((template.data?.sections ?? []).map((section) => [section.id, 'yes']));
  const chosen = Object.entries(current).filter((entry): entry is [string, 'yes' | 'no'] => Boolean(entry[1]));

  function apply() {
    choose.mutate(
      { id: report.id, data: { templateId, sections: chosen.map(([id, variant]) => ({ id, variant })) } },
      { onSuccess: onClose, onError: (error) => toast.error(error.message) },
    );
  }

  return (
    <FormDialog
      size="lg"
      title={t('template_sections')}
      description={t('template_sections_description')}
      onClose={onClose}
    >
      <TemplateSelect type={report.type} value={templateId} onChange={setTemplateId} />
      {template.isLoading ? (
        <DefaultLoading />
      ) : template.data ? (
        <SectionsPicker
          sections={template.data.sections}
          choices={current}
          onChange={(values) => setChoices({ templateId, values })}
        />
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={choose.isPending} onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="button" disabled={!chosen.length || choose.isPending} onClick={apply}>
          {t('apply')}
        </Button>
      </div>
    </FormDialog>
  );
}
