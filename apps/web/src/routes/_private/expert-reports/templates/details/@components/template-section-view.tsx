import { ItemTitle } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TemplateSectionRecord } from '@/query/report.js';

// Read view of a default template section (or for whoever does not edit templates): both texts.
export function TemplateSectionView({ section, onClose }: { section: TemplateSectionRecord; onClose: () => void }) {
  return (
    <FormDialog title={section.title} size="lg" onClose={onClose}>
      {section.titleOnly ? (
        <ItemTitle>{t('title_only')}</ItemTitle>
      ) : (
        <div className="grid gap-4">
          <ItemTitle>{t('yes_text')}</ItemTitle>
          <RichTextEditor value={section.yesText} readOnly label={t('yes_text')} />
          <ItemTitle>{t('no_text')}</ItemTitle>
          <RichTextEditor value={section.noText} readOnly label={t('no_text')} />
        </div>
      )}
    </FormDialog>
  );
}
