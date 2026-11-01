import { ItemTitle } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TemplateSectionRecord } from '@/query/report.js';

// Leitura da seção do modelo padrão (ou para quem não edita modelos): os dois textos.
export function TemplateSectionView({ section, onClose }: { section: TemplateSectionRecord; onClose: () => void }) {
  return (
    <FormDialog title={section.titulo} size="lg" onClose={onClose}>
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
