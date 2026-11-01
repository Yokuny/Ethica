import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { TextareaField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { guardarMidia, type Rascunho } from '@/lib/offline/store.js';
import { atualizarPendencias, sincronizar } from '@/lib/offline/sync.js';
import type { VistoriaDoDia } from '@/query/vistoria.js';
import { useRegistro } from '../@hooks/use-registro.js';
import { AgentesFields, DocumentosFields } from './agentes-documentos-fields.js';
import { ConflitoDialog } from './conflito-dialog.js';
import { FuncoesFields } from './funcoes-fields.js';
import { MidiasPanel } from './midias-panel.js';
import { ParadigmasFields } from './paradigmas-fields.js';
import { PresentesFields } from './presentes-fields.js';

const ABAS = [
  ['presentes', 'attendees'],
  ['paradigmas', 'paradigms'],
  ['funcoes', 'job_roles'],
  ['agentes', 'agents'],
  ['documentos', 'documents'],
  ['midias', 'media'],
  ['observacoes', 'notes'],
] as const;

// Registro em abas (CAM-02): tudo fica no aparelho a cada mudança e sobe sozinho (AD-128).
export function RegistroForm({ item, rascunho }: { item: VistoriaDoDia; rascunho?: Rascunho }) {
  const queryClient = useQueryClient();
  const { form, conflito, manterMinha, usarDoServidor } = useRegistro(item, rascunho);

  // Assinatura entra na fila de mídias com id do aparelho; o registro guarda o id.
  async function guardarAssinatura(png: Blob): Promise<string> {
    const midiaId = crypto.randomUUID();
    await guardarMidia({
      compromissoId: item.compromisso.id,
      midiaId,
      tipo: 'signature',
      mime: 'image/png',
      blob: png,
      criadoEm: new Date().toISOString(),
    });
    await atualizarPendencias();
    void sincronizar(queryClient);
    return midiaId;
  }

  return (
    <Form {...form}>
      <form noValidate onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-4">
        <Tabs defaultValue="presentes">
          <div className="-mx-1 overflow-x-auto px-1">
            <TabsList variant="line">
              {ABAS.map(([valor, chave]) => (
                <TabsTrigger key={valor} value={valor}>
                  {t(chave)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="presentes" className="pt-4">
            <PresentesFields form={form} pericia={item.pericia} onAssinatura={guardarAssinatura} />
          </TabsContent>
          <TabsContent value="paradigmas" className="pt-4">
            <ParadigmasFields form={form} />
          </TabsContent>
          <TabsContent value="funcoes" className="pt-4">
            <FuncoesFields form={form} />
          </TabsContent>
          <TabsContent value="agentes" className="pt-4">
            <AgentesFields form={form} />
          </TabsContent>
          <TabsContent value="documentos" className="pt-4">
            <DocumentosFields form={form} />
          </TabsContent>
          <TabsContent value="midias" className="pt-4">
            <MidiasPanel item={item} />
          </TabsContent>
          <TabsContent value="observacoes" className="grid gap-2 pt-4">
            <TextareaField
              control={form.control}
              name="observacoes"
              label={t('internal_notes')}
              placeholder={t('internal_notes_placeholder')}
            />
            <ItemDescription>{t('internal_notes_description')}</ItemDescription>
          </TabsContent>
        </Tabs>
      </form>
      {conflito && (
        <ConflitoDialog
          servidor={conflito}
          onManterMinha={() => void manterMinha()}
          onUsarServidor={() => void usarDoServidor()}
          onClose={() => void manterMinha()}
        />
      )}
    </Form>
  );
}
