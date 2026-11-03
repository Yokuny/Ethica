import type { ReportVariable } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { variableLabel } from '@/components/report-labels.js';
import { type PhotoEditor, RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportSectionRecord } from '@/query/report.js';

export type SectionDraft = { title: string; html: string };

type ReportSectionEditorProps = {
  reportId: string;
  section: ReportSectionRecord;
  draft: SectionDraft;
  readOnly: boolean;
  pending: ReportVariable[];
  onChange: (draft: SectionDraft) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onAdd: () => void;
  onRemove: () => void;
  photos?: PhotoEditor[];
  uploadPhoto?: (photo: Blob) => Promise<string>;
};

// Body of an opened item (LAU-03.1, NLA-05): title, text and the actions of the item. Saving saves only it.
export function ReportSectionEditor({
  reportId,
  section,
  draft,
  readOnly,
  pending,
  onChange,
  dirty,
  saving,
  onSave,
  onAdd,
  onRemove,
  photos,
  uploadPhoto,
}: ReportSectionEditorProps) {
  return (
    <div className="grid gap-4">
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
        value={draft.title}
        readOnly={readOnly}
        aria-label={t('section_title')}
        placeholder={t('section_title')}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
      />
      {!section.titleOnly && (
        <RichTextEditor
          key={`${reportId}-${section.id}-${readOnly}`}
          value={draft.html}
          readOnly={readOnly}
          label={t('section_text')}
          photos={photos}
          uploadPhoto={uploadPhoto}
          onChange={(html) => onChange({ ...draft, html })}
        />
      )}
      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onRemove} disabled={saving}>
            {t('remove_section')}
          </Button>
          <Button variant="outline" onClick={onAdd} disabled={saving}>
            {t('add_item_below')}
          </Button>
          <Button onClick={onSave} disabled={!dirty || saving}>
            {t('save')}
          </Button>
        </div>
      )}
    </div>
  );
}
