import { VISTORIA_QUALIDADES, type VistoriaDados } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useState } from 'react';
import { type UseFormReturn, useFieldArray } from 'react-hook-form';
import { SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiaDoCampo } from '@/query/vistoria.js';
import { QUALIDADE_KEY } from '../../@consts/campo-labels.js';
import { AssinaturaDialog } from './assinatura-dialog.js';
import { ListaCampos } from './lista-campos.js';

const QUALIDADES = VISTORIA_QUALIDADES.map((value) => ({ value, label: t(QUALIDADE_KEY[value]) }));

type PresentesFieldsProps = {
  form: UseFormReturn<VistoriaDados>;
  pericia?: PericiaDoCampo;
  onAssinatura: (blob: Blob) => Promise<string>;
};

// Quem estava na vistoria (CAM-02, CAM-06): nome, qualidade, e-mail e assinatura na tela.
export function PresentesFields({ form, pericia, onAssinatura }: PresentesFieldsProps) {
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'presentes' });
  const [assinando, setAssinando] = useState<number | null>(null);

  function adicionarPartes() {
    const nomes = (texto: string | undefined) => (texto ? texto.split(', ') : []);
    for (const nome of nomes(pericia?.autor)) append({ id: crypto.randomUUID(), nome, qualidade: 'plaintiff' });
    for (const nome of nomes(pericia?.reu)) append({ id: crypto.randomUUID(), nome, qualidade: 'defendant' });
  }

  return (
    <>
      <ListaCampos
        titulo={t('attendees')}
        vazio={t('no_attendees_yet')}
        acoes={
          <>
            {pericia && (
              <Button type="button" variant="outline" onClick={adicionarPartes}>
                {t('add_case_parties')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ id: crypto.randomUUID(), nome: '', qualidade: 'witness' })}
            >
              {t('add_attendee')}
            </Button>
          </>
        }
        itens={fields.map((field, index) => ({
          key: field.id,
          onRemove: () => remove(index),
          conteudo: (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  control={form.control}
                  name={`presentes.${index}.nome`}
                  label={t('name')}
                  placeholder={t('full_name')}
                />
                <SelectField
                  control={form.control}
                  name={`presentes.${index}.qualidade`}
                  label={t('attendee_role')}
                  placeholder={t('choose')}
                  items={QUALIDADES}
                />
              </div>
              <TextField
                control={form.control}
                name={`presentes.${index}.email`}
                label={t('email')}
                placeholder={t('email_placeholder')}
              />
              <div className="flex items-center gap-2">
                {field.assinaturaId ? (
                  <Badge variant="success">{t('signed')}</Badge>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setAssinando(index)}>
                    {t('collect_signature')}
                  </Button>
                )}
              </div>
            </>
          ),
        }))}
      />
      {assinando !== null && (
        <AssinaturaDialog
          nome={form.getValues(`presentes.${assinando}.nome`)}
          onClose={() => setAssinando(null)}
          onConfirm={async (blob) => {
            const assinaturaId = await onAssinatura(blob);
            update(assinando, { ...form.getValues(`presentes.${assinando}`), assinaturaId });
            setAssinando(null);
          }}
        />
      )}
    </>
  );
}
