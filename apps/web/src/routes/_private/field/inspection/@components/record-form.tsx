import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ethica/ui/components/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { TextareaField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type Draft, storeMedia } from '@/lib/offline/store.js';
import { runSync, updateIssues } from '@/lib/offline/sync.js';
import type { DayInspection } from '@/query/inspection.js';
import { useRecord } from '../@hooks/use-record.js';
import { AgentsFields, DocumentsFields } from './agents-documents-fields.js';
import { AttendeesFields } from './attendees-fields.js';
import { ComparatorsFields } from './comparators-fields.js';
import { ConflictDialog } from './conflict-dialog.js';
import { JobsFields } from './jobs-fields.js';
import { MediaPanel } from './media-panel.js';

const ABAS = [
  ['attendees', 'attendees'],
  ['comparators', 'paradigms'],
  ['jobs', 'job_roles'],
  ['agents', 'agents'],
  ['documents', 'documents'],
  ['media', 'media'],
  ['notes', 'notes'],
] as const;

// Record in tabs (CAM-02): everything stays on the device on every change and goes up by itself (AD-128).
export function RecordForm({ item, draft }: { item: DayInspection; draft?: Draft }) {
  const queryClient = useQueryClient();
  const { form, conflict, keepMine, keepServer } = useRecord(item, draft);

  // The signature goes into the media queue with a device id; the record keeps the id.
  async function storeSignature(png: Blob): Promise<string> {
    const mediaId = crypto.randomUUID();
    await storeMedia({
      appointmentId: item.appointment.id,
      mediaId,
      type: 'signature',
      mime: 'image/png',
      blob: png,
      createdAt: new Date().toISOString(),
    });
    await updateIssues();
    void runSync(queryClient);
    return mediaId;
  }

  return (
    <Form {...form}>
      <form noValidate onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-4">
        <Tabs defaultValue="attendees">
          <div className="-mx-1 overflow-x-auto px-1">
            <TabsList variant="line">
              {ABAS.map(([amount, key]) => (
                <TabsTrigger key={amount} value={amount}>
                  {t(key)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="attendees" className="pt-4">
            <AttendeesFields form={form} legalCase={item.legalCase} onSignature={storeSignature} />
          </TabsContent>
          <TabsContent value="comparators" className="pt-4">
            <ComparatorsFields form={form} />
          </TabsContent>
          <TabsContent value="jobs" className="pt-4">
            <JobsFields form={form} />
          </TabsContent>
          <TabsContent value="agents" className="pt-4">
            <AgentsFields form={form} />
          </TabsContent>
          <TabsContent value="documents" className="pt-4">
            <DocumentsFields form={form} />
          </TabsContent>
          <TabsContent value="media" className="pt-4">
            <MediaPanel item={item} />
          </TabsContent>
          <TabsContent value="notes" className="grid gap-2 pt-4">
            <TextareaField
              control={form.control}
              name="notes"
              label={t('internal_notes')}
              placeholder={t('internal_notes_placeholder')}
            />
            <ItemDescription>{t('internal_notes_description')}</ItemDescription>
          </TabsContent>
        </Tabs>
      </form>
      {conflict && (
        <ConflictDialog
          server={conflict}
          onKeepMine={() => void keepMine()}
          onUseServer={() => void keepServer()}
          onClose={() => void keepMine()}
        />
      )}
    </Form>
  );
}
