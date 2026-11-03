import type { ReportVariable } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { variableLabel } from '@/components/report-labels.js';
import { type PhotoEditor, RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportSectionRecord } from '@/query/report.js';

type ReportSectionEditorProps = {
  reportId: string;
  section: ReportSectionRecord;
  // Text being edited (HTML).
  draft: string;
  readOnly: boolean;
  pending: ReportVariable[];
  onChange: (html: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  photos?: PhotoEditor[];
  uploadPhoto?: (photo: Blob) => Promise<string>;
};

// Body of an opened item (LAU-03.1, NLA-05): the text. Title, order and the other actions are on the item row.
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
      <RichTextEditor
        key={`${reportId}-${section.id}-${readOnly}`}
        value={draft}
        readOnly={readOnly}
        label={t('section_text')}
        photos={photos}
        uploadPhoto={uploadPhoto}
        onChange={onChange}
      />
      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={!dirty || saving}>
            {t('save')}
          </Button>
        </div>
      )}
    </div>
  );
}
