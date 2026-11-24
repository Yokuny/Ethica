import type { InspectionData } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Panel } from '@/components/panel.js';
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useStateSync } from '@/lib/offline/sync.js';
import { CAPACITY_KEY } from '../../../@consts/field-labels.js';
import { SignatureDialog } from './signature-dialog.js';

type SignaturesPanelProps = {
  form: UseFormReturn<InspectionData>;
  appointmentId: string;
  onSignature: (blob: Blob) => Promise<string>;
};

// Signatures of everyone at the inspection and the inspection term in PDF (LOG-06, LOG-07, AD-239). The PDF is built
// by the API, so it waits for the connection and for everything on the device to be sent.
export function SignaturesPanel({ form, appointmentId, onSignature }: SignaturesPanelProps) {
  const sync = useStateSync();
  const { download, pending: downloading } = useFileDownload();
  const [signing, setSigning] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const attendees = form.watch('attendees');
  const path = `/documents/inspections/${appointmentId}`;
  const waiting = !sync.online
    ? t('pdf_needs_connection')
    : sync.pending > 0 || sync.syncing
      ? t('pdf_waiting_sync')
      : '';

  return (
    <>
      <Panel title={t('signatures')} description={t('signatures_description')}>
        {!attendees.length ? (
          <ItemTitle className="font-normal text-muted-foreground">{t('no_attendees_yet')}</ItemTitle>
        ) : (
          <ItemGroup>
            {attendees.map((attendee, index) => (
              <Item key={attendee.id} render={<li />}>
                <ItemContent>
                  <ItemTitle>{attendee.name || t('name')}</ItemTitle>
                  <ItemDescription>{t(CAPACITY_KEY[attendee.capacity])}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  {attendee.signatureId ? (
                    <Badge variant="success">{t('signed')}</Badge>
                  ) : (
                    <Button type="button" variant="outline" disabled={!attendee.name} onClick={() => setSigning(index)}>
                      {t('collect_signature')}
                    </Button>
                  )}
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </Panel>
      <Panel
        title={t('inspection_term')}
        description={t('inspection_term_description')}
        actions={
          <Button type="button" variant="outline" disabled={Boolean(waiting)} onClick={() => setPreviewing(true)}>
            <FileText />
            {t('preview_pdf')}
          </Button>
        }
      >
        {waiting && <ItemDescription className="line-clamp-none">{waiting}</ItemDescription>}
      </Panel>
      {signing !== null && (
        <SignatureDialog
          name={form.getValues(`attendees.${signing}.name`)}
          onClose={() => setSigning(null)}
          onConfirm={async (blob) => {
            const signatureId = await onSignature(blob);
            form.setValue(`attendees.${signing}.signatureId`, signatureId, { shouldDirty: true });
            setSigning(null);
          }}
        />
      )}
      {previewing && (
        <PdfPreviewDialog path={path} description={t('inspection_term')} onClose={() => setPreviewing(false)}>
          <Button disabled={downloading === path} onClick={() => download(path)}>
            {t('generate_pdf')}
          </Button>
        </PdfPreviewDialog>
      )}
    </>
  );
}
