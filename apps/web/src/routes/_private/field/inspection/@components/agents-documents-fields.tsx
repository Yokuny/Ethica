import { INSPECTION_AGENTS, INSPECTION_DOCUMENTS, type InspectionData } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemTitle } from '@ethica/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/checkbox.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { AGENT_KEY, DOCUMENTO_KEY } from '../../@consts/field-labels.js';

const NENHUM = 'none';
const PADRAO: readonly string[] = INSPECTION_DOCUMENTS;

type Props = { form: UseFormReturn<InspectionData> };

// Mapeamento de agentes (CAM-02): Sim/Não com EPI e observação; só os marcados vão para o registro.
export function AgentsFields({ form }: Props) {
  const agents = form.watch('agents');
  const definir = (lista: InspectionData['agents']) => form.setValue('agents', lista, { shouldDirty: true });

  return (
    <Panel title={t('agents_mapping')} description={t('agents_mapping_description')}>
      <ul className="flex flex-col divide-y divide-border">
        {INSPECTION_AGENTS.map((agent) => {
          const atual = agents.find((item) => item.agent === agent);
          const alterar = (partial: Partial<InspectionData['agents'][number]>) =>
            definir(agents.map((item) => (item.agent === agent ? { ...item, ...partial } : item)));
          return (
            <li key={agent} className="grid gap-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <ItemTitle className="flex-1">{t(AGENT_KEY[agent])}</ItemTitle>
                <ToggleGroup
                  value={atual?.present ?? NENHUM}
                  onValueChange={(value) =>
                    value === NENHUM
                      ? definir(agents.filter((item) => item.agent !== agent))
                      : atual
                        ? alterar({ present: value as 'yes' | 'no' })
                        : definir([...agents, { agent, present: value as 'yes' | 'no' }])
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
                    value={atual.ppe ?? ''}
                    onChange={(event) => alterar({ ppe: event.target.value })}
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
  const definir = (lista: InspectionData['documentos']) => form.setValue('documentos', lista, { shouldDirty: true });
  const free = documentos.filter((documento) => !PADRAO.includes(documento.documento));

  return (
    <Panel
      title={t('requested_documents')}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => definir([...documentos, { id: crypto.randomUUID(), documento: '', requested: true }])}
        >
          {t('add_document')}
        </Button>
      }
    >
      <div className="grid gap-2">
        {INSPECTION_DOCUMENTS.map((chave) => {
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
                    ? [...documentos, { id: chave, documento: chave, requested: true }]
                    : documentos.filter((documento) => documento.documento !== chave),
                )
              }
            />
          );
        })}
        {free.map((documento) => (
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
