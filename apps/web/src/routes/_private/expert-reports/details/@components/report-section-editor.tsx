import { numberSections } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { Panel } from '@/components/panel.js';
import { variableLabel } from '@/components/report-labels.js';
import { type PhotoEditor, RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportRecord, ReportSectionRecord } from '@/query/report.js';

export type SectionDraft = { titulo: string; html: string };

type ReportSectionEditorProps = {
  report: ReportRecord;
  section: ReportSectionRecord;
  draft: SectionDraft;
  onChange: (draft: SectionDraft) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onRemove: () => void;
  photos?: PhotoEditor[];
};

// Uma seção por vez (LAU-03.1): salvar grava só ela; o resto do laudo não muda.
export function ReportSectionEditor({
  report,
  section,
  draft,
  onChange,
  dirty,
  saving,
  onSave,
  onRemove,
  photos,
}: ReportSectionEditorProps) {
  const readOnly = report.status === 'completed';
  const numero = numberSections(report.sections)[report.sections.findIndex((item) => item.id === section.id)];
  const pending = report.issues.find((issue) => issue.sectionId === section.id)?.variables ?? [];

  return (
    <Panel
      title={`${numero}. ${section.titulo}`}
      description={section.titleOnly ? t('title_only') : t(section.variant === 'yes' ? 'yes_text' : 'no_text')}
      actions={
        !readOnly && (
          <>
            <Button variant="destructive" onClick={onRemove} disabled={report.sections.length === 1 || saving}>
              {t('remove_section')}
            </Button>
            <Button onClick={onSave} disabled={!dirty || saving}>
              {t('save')}
            </Button>
          </>
        )
      }
    >
      {pending.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-1.5">
          <ItemDescription className="line-clamp-none">{t('fill_or_remove_variables')}</ItemDescription>
          {pending.map((variable) => (
            <Badge key={variable} variant="warning" title={variableLabel(variable)}>
              {variable}
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={draft.titulo}
        readOnly={readOnly}
        aria-label={t('section_title')}
        placeholder={t('section_title')}
        onChange={(event) => onChange({ ...draft, titulo: event.target.value })}
      />
      {!section.titleOnly && (
        <RichTextEditor
          key={`${report.id}-${section.id}-${report.status}`}
          value={draft.html}
          readOnly={readOnly}
          label={t('section_text')}
          photos={photos}
          onChange={(html) => onChange({ ...draft, html })}
        />
      )}
    </Panel>
  );
}
