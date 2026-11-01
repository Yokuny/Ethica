import { INSPECTION_MEDIA_LIMITS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Mic, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Panel } from '@/components/panel.js';
import { apiUrl, del, patch } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { preparePhoto } from '@/lib/offline/photo.js';
import { deleteMedia, listMedia, type PendingMedia, storeMedia } from '@/lib/offline/store.js';
import { runSync, updateIssues } from '@/lib/offline/sync.js';
import { type DayInspection, inspectionKeys } from '@/query/inspection.js';

// File still only on the device: shown through the local blob URL.
function BlobMedia({ media }: { media: PendingMedia }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const local = URL.createObjectURL(media.blob);
    setUrl(local);
    return () => URL.revokeObjectURL(local);
  }, [media.blob]);
  if (!url) return null;
  return media.type === 'audio' ? (
    // biome-ignore lint/a11y/useMediaCaption: inspection recording, without captions
    <audio controls src={url} className="w-full" />
  ) : (
    <img src={url} alt={media.caption ?? ''} className="h-auto w-full rounded-md" />
  );
}

// Inspection photos and audio (CAM-03, CAM-07): they go into the device queue and go up when there is
// a connection (AD-128); the sent ones come from the API.
export function MediaPanel({ item }: { item: DayInspection }) {
  const queryClient = useQueryClient();
  const appointmentId = item.appointment.id;
  const pending = useQuery({
    queryKey: inspectionKeys.pending(appointmentId),
    networkMode: 'always',
    queryFn: async () => (await listMedia()).filter((media) => media.appointmentId === appointmentId),
  });
  const camera = useRef<HTMLInputElement>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const sent = item.inspection.media.filter((media) => media.type !== 'signature');
  const photos = sent.filter((media) => media.type === 'photo').length;

  async function enqueue(media: Omit<PendingMedia, 'appointmentId' | 'mediaId' | 'createdAt'>) {
    await storeMedia({ ...media, appointmentId, mediaId: crypto.randomUUID(), createdAt: new Date().toISOString() });
    await updateIssues();
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.pending(appointmentId) });
    void runSync(queryClient);
  }

  async function addPhotos(files: FileList | null) {
    for (const file of [...(files ?? [])]) {
      if (photos + (pending.data?.length ?? 0) >= INSPECTION_MEDIA_LIMITS.photo.maxByInspection) {
        toast.error(t('media_limit_reached'));
        break;
      }
      const blob = await preparePhoto(file, { address: item.appointment.location });
      await enqueue({ type: 'photo', mime: 'image/jpeg', blob });
    }
  }

  async function save() {
    if (recorder) {
      recorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const parties: Blob[] = [];
      recorder.ondataavailable = (event) => parties.push(event.data);
      recorder.onstop = () => {
        for (const track of stream.getTracks()) track.stop();
        setRecorder(null);
        const mime = (recorder.mimeType.split(';')[0] || 'audio/webm') as string;
        void enqueue({ type: 'audio', mime, blob: new Blob(parties, { type: mime }) });
      };
      recorder.start();
      setRecorder(recorder);
    } catch {
      toast.error(t('microphone_unavailable'));
    }
  }

  async function removeSent(mediaId: string) {
    const res = await del(`/inspections/${appointmentId}/media/${mediaId}`);
    if (!res.success) toast.error(res.message);
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(appointmentId) });
  }

  async function sentCaption(mediaId: string, caption: string) {
    const res = await patch(`/inspections/${appointmentId}/media/${mediaId}`, { caption });
    if (!res.success) toast.error(res.message);
  }

  async function pendingCaption(media: PendingMedia, caption: string) {
    await storeMedia({ ...media, caption });
    await queryClient.invalidateQueries({ queryKey: inspectionKeys.pending(appointmentId) });
  }

  return (
    <Panel
      title={t('photos_and_audio')}
      description={t('photos_and_audio_description')}
      actions={
        <>
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(event) => {
              void addPhotos(event.target.files);
              event.target.value = '';
            }}
          />
          <Button type="button" variant="outline" onClick={() => camera.current?.click()}>
            <Camera />
            {t('add_photo')}
          </Button>
          <Button type="button" variant={recorder ? 'destructive' : 'outline'} onClick={() => void save()}>
            {recorder ? <Square /> : <Mic />}
            {t(recorder ? 'stop_recording' : 'record_audio')}
          </Button>
        </>
      }
    >
      {!sent.length && !pending.data?.length ? (
        <ItemTitle className="font-normal text-muted-foreground">{t('no_media_yet')}</ItemTitle>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {pending.data?.map((media) => (
            <li key={media.mediaId} className="grid gap-2">
              <BlobMedia media={media} />
              <ItemDescription className="line-clamp-none">
                {media.failure ? `${t('upload_failed')}: ${media.failure}` : t('waiting_to_send')}
              </ItemDescription>
              <div className="flex gap-2">
                <Input
                  aria-label={t('caption')}
                  placeholder={t('caption_placeholder')}
                  defaultValue={media.caption ?? ''}
                  onBlur={(event) => void pendingCaption(media, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('remove')}
                  onClick={async () => {
                    await deleteMedia(media.mediaId);
                    await updateIssues();
                    await pending.refetch();
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
          {sent.map((media) => {
            const src = apiUrl(`/inspections/${appointmentId}/media/${media.id}`);
            return (
              <li key={media.id} className="grid gap-2">
                {media.type === 'audio' ? (
                  // biome-ignore lint/a11y/useMediaCaption: inspection recording, without captions
                  <audio controls src={src} className="w-full" />
                ) : (
                  <img src={src} alt={media.caption ?? ''} className="h-auto w-full rounded-md" />
                )}
                <div className="flex gap-2">
                  <Input
                    aria-label={t('caption')}
                    placeholder={t('caption_placeholder')}
                    defaultValue={media.caption ?? ''}
                    onBlur={(event) => void sentCaption(media.id, event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('remove')}
                    onClick={() => void removeSent(media.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
