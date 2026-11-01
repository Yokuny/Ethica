import { INSPECTION_AGENTS, INSPECTION_DOCUMENTS, type InspectionData } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemTitle } from '@ethica/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/checkbox.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { AGENT_KEY, DOCUMENT_KEY } from '../../@consts/field-labels.js';

const NONE = 'none';
const DEFAULT: readonly string[] = INSPECTION_DOCUMENTS;

type Props = { form: UseFormReturn<InspectionData> };

// Agent mapping (CAM-02): Yes/No with PPE and a note; only the checked ones go into the record.
export function AgentsFields({ form }: Props) {
  const agents = form.watch('agents');
  const set = (list: InspectionData['agents']) => form.setValue('agents', list, { shouldDirty: true });

  return (
    <Panel title={t('agents_mapping')} description={t('agents_mapping_description')}>
      <ul className="flex flex-col divide-y divide-border">
        {INSPECTION_AGENTS.map((agent) => {
          const current = agents.find((item) => item.agent === agent);
          const change = (partial: Partial<InspectionData['agents'][number]>) =>
            set(agents.map((item) => (item.agent === agent ? { ...item, ...partial } : item)));
          return (
            <li key={agent} className="grid gap-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <ItemTitle className="flex-1">{t(AGENT_KEY[agent])}</ItemTitle>
                <ToggleGroup
                  value={current?.present ?? NONE}
                  onValueChange={(value) =>
                    value === NONE
                      ? set(agents.filter((item) => item.agent !== agent))
                      : current
                        ? change({ present: value as 'yes' | 'no' })
                        : set([...agents, { agent, present: value as 'yes' | 'no' }])
                  }
                >
                  <ToggleGroupItem value="yes" tone="warning">
                    {t('yes')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="no" tone="success">
                    {t('no')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value={NONE}>{t('not_evaluated')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
              {current && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    aria-label={t('ppe')}
                    placeholder={t('ppe_placeholder')}
                    value={current.ppe ?? ''}
                    onChange={(event) => change({ ppe: event.target.value })}
                  />
                  <Input
                    aria-label={t('notes')}
                    placeholder={t('notes_placeholder')}
                    value={current.notes ?? ''}
                    onChange={(event) => change({ notes: event.target.value })}
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

// Documents requested from the parties (CAM-02): the checklist defaults and whatever the expert writes.
export function DocumentsFields({ form }: Props) {
  const documents = form.watch('documents');
  const set = (list: InspectionData['documents']) => form.setValue('documents', list, { shouldDirty: true });
  const free = documents.filter((document) => !DEFAULT.includes(document.document));

  return (
    <Panel
      title={t('requested_documents')}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => set([...documents, { id: crypto.randomUUID(), document: '', requested: true }])}
        >
          {t('add_document')}
        </Button>
      }
    >
      <div className="grid gap-2">
        {INSPECTION_DOCUMENTS.map((key) => {
          const checked = documents.some((document) => document.document === key);
          return (
            <Checkbox
              key={key}
              checked={checked}
              labelClassName="normal-case tracking-normal"
              label={t(DOCUMENT_KEY[key] ?? key)}
              onCheckedChange={(checked) =>
                set(
                  checked
                    ? [...documents, { id: key, document: key, requested: true }]
                    : documents.filter((document) => document.document !== key),
                )
              }
            />
          );
        })}
        {free.map((document) => (
          <div key={document.id} className="flex gap-2">
            <Input
              aria-label={t('document')}
              placeholder={t('document_placeholder')}
              value={document.document}
              onChange={(event) =>
                set(
                  documents.map((item) => (item.id === document.id ? { ...item, document: event.target.value } : item)),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => set(documents.filter((item) => item.id !== document.id))}
            >
              {t('remove')}
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
