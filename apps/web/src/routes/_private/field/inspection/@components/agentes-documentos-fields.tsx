import { VISTORIA_AGENTES, VISTORIA_DOCUMENTOS, type VistoriaDados } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemTitle } from '@ethica/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/checkbox.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { AGENTE_KEY, DOCUMENTO_KEY } from '../../@consts/campo-labels.js';

const NENHUM = 'none';
const PADRAO: readonly string[] = VISTORIA_DOCUMENTOS;

type Props = { form: UseFormReturn<VistoriaDados> };

// Mapeamento de agentes (CAM-02): Sim/Não com EPI e observação; só os marcados vão para o registro.
export function AgentesFields({ form }: Props) {
  const agentes = form.watch('agentes');
  const definir = (lista: VistoriaDados['agentes']) => form.setValue('agentes', lista, { shouldDirty: true });

  return (
    <Panel title={t('agents_mapping')} description={t('agents_mapping_description')}>
      <ul className="flex flex-col divide-y divide-border">
        {VISTORIA_AGENTES.map((agente) => {
          const atual = agentes.find((item) => item.agente === agente);
          const alterar = (parcial: Partial<VistoriaDados['agentes'][number]>) =>
            definir(agentes.map((item) => (item.agente === agente ? { ...item, ...parcial } : item)));
          return (
            <li key={agente} className="grid gap-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <ItemTitle className="flex-1">{t(AGENTE_KEY[agente])}</ItemTitle>
                <ToggleGroup
                  value={atual?.presente ?? NENHUM}
                  onValueChange={(value) =>
                    value === NENHUM
                      ? definir(agentes.filter((item) => item.agente !== agente))
                      : atual
                        ? alterar({ presente: value as 'yes' | 'no' })
                        : definir([...agentes, { agente, presente: value as 'yes' | 'no' }])
                  }
                >
                  <ToggleGroupItem value="yes" tone="warning">
                    {t('yes')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="no" tone="success">
                    {t('no')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value={NENHUM}>{t('not_evaluated')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
              {atual && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    aria-label={t('ppe')}
                    placeholder={t('ppe_placeholder')}
                    value={atual.epi ?? ''}
                    onChange={(event) => alterar({ epi: event.target.value })}
                  />
                  <Input
                    aria-label={t('notes')}
                    placeholder={t('notes_placeholder')}
                    value={atual.observacoes ?? ''}
                    onChange={(event) => alterar({ observacoes: event.target.value })}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// Documentos pedidos às partes (CAM-02): os padrões do checklist e os que o perito escrever.
export function DocumentosFields({ form }: Props) {
  const documentos = form.watch('documentos');
  const definir = (lista: VistoriaDados['documentos']) => form.setValue('documentos', lista, { shouldDirty: true });
  const livres = documentos.filter((documento) => !PADRAO.includes(documento.documento));

  return (
    <Panel
      title={t('requested_documents')}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => definir([...documentos, { id: crypto.randomUUID(), documento: '', solicitado: true }])}
        >
          {t('add_document')}
        </Button>
      }
    >
      <div className="grid gap-2">
        {VISTORIA_DOCUMENTOS.map((chave) => {
          const marcado = documentos.some((documento) => documento.documento === chave);
          return (
            <Checkbox
              key={chave}
              checked={marcado}
              labelClassName="normal-case tracking-normal"
              label={t(DOCUMENTO_KEY[chave] ?? chave)}
              onCheckedChange={(checked) =>
                definir(
                  checked
                    ? [...documentos, { id: chave, documento: chave, solicitado: true }]
                    : documentos.filter((documento) => documento.documento !== chave),
                )
              }
            />
          );
        })}
        {livres.map((documento) => (
          <div key={documento.id} className="flex gap-2">
            <Input
              aria-label={t('document')}
              placeholder={t('document_placeholder')}
              value={documento.documento}
              onChange={(event) =>
                definir(
                  documentos.map((item) =>
                    item.id === documento.id ? { ...item, documento: event.target.value } : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => definir(documentos.filter((item) => item.id !== documento.id))}
            >
              {t('remove')}
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
