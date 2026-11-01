import { numerarSecoes } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { variavelLabel } from '@/components/laudo-labels.js';
import { Panel } from '@/components/panel.js';
import { type PhotoEditor, RichTextEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LaudoRecord, LaudoSecaoRecord } from '@/query/laudo.js';

export type SectionDraft = { titulo: string; html: string };

type LaudoSecaoEditorProps = {
  laudo: LaudoRecord;
  secao: LaudoSecaoRecord;
  draft: SectionDraft;
  onChange: (draft: SectionDraft) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onRemove: () => void;
  photos?: PhotoEditor[];
};

// Uma seção por vez (LAU-03.1): salvar grava só ela; o resto do laudo não muda.
export function LaudoSecaoEditor({
  laudo,
  secao,
  draft,
  onChange,
  dirty,
  saving,
  onSave,
  onRemove,
  photos,
}: LaudoSecaoEditorProps) {
  const readOnly = laudo.status === 'completed';
  const numero = numerarSecoes(laudo.secoes)[laudo.secoes.findIndex((item) => item.id === secao.id)];
  const pending = laudo.pendencias.find((pendencia) => pendencia.secaoId === secao.id)?.variaveis ?? [];

  return (
    <Panel
      title={`${numero}. ${secao.titulo}`}
      description={secao.apenasTitulo ? t('title_only') : t(secao.variante === 'yes' ? 'yes_text' : 'no_text')}
      actions={
        !readOnly && (
          <>
            <Button variant="destructive" onClick={onRemove} disabled={laudo.secoes.length === 1 || saving}>
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
          {pending.map((variavel) => (
            <Badge key={variavel} variant="warning" title={variavelLabel(variavel)}>
              {variavel}
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
      {!secao.apenasTitulo && (
        <RichTextEditor
          key={`${laudo.id}-${secao.id}-${laudo.status}`}
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
