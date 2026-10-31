import { ItemTitle } from '@ethica/ui/components/item';
import { FormDialog } from '@/components/form-dialog.js';
import { RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ModeloSecaoRecord } from '@/query/laudo.js';

// Leitura da seção do modelo padrão (ou para quem não edita modelos): os dois textos.
export function ModeloSecaoView({ secao, onClose }: { secao: ModeloSecaoRecord; onClose: () => void }) {
  return (
    <FormDialog title={secao.titulo} size="lg" onClose={onClose}>
      {secao.apenasTitulo ? (
        <ItemTitle>{t('title_only')}</ItemTitle>
      ) : (
        <div className="grid gap-4">
          <ItemTitle>{t('yes_text')}</ItemTitle>
          <RichTextEditor value={secao.textoSim} readOnly label={t('yes_text')} />
          <ItemTitle>{t('no_text')}</ItemTitle>
          <RichTextEditor value={secao.textoNao} readOnly label={t('no_text')} />
        </div>
      )}
    </FormDialog>
  );
}
