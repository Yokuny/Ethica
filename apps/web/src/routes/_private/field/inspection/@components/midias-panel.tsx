import { VISTORIA_MIDIA_LIMITES } from '@ethica/contracts';
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
import { prepararFoto } from '@/lib/offline/foto.js';
import { apagarMidia, guardarMidia, listarMidias, type MidiaPendente } from '@/lib/offline/store.js';
import { atualizarPendencias, sincronizar } from '@/lib/offline/sync.js';
import { type VistoriaDoDia, vistoriaKeys } from '@/query/vistoria.js';

// Arquivo ainda só no aparelho: mostrado pela URL local do blob.
function BlobMidia({ midia }: { midia: MidiaPendente }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const local = URL.createObjectURL(midia.blob);
    setUrl(local);
    return () => URL.revokeObjectURL(local);
  }, [midia.blob]);
  if (!url) return null;
  return midia.tipo === 'audio' ? (
    // biome-ignore lint/a11y/useMediaCaption: gravação da vistoria, sem legenda
    <audio controls src={url} className="w-full" />
  ) : (
    <img src={url} alt={midia.legenda ?? ''} className="h-auto w-full rounded-md" />
  );
}

// Fotos e áudios da vistoria (CAM-03, CAM-07): entram na fila do aparelho e sobem quando há
// conexão (AD-128); as enviadas vêm da API.
export function MidiasPanel({ item }: { item: VistoriaDoDia }) {
  const queryClient = useQueryClient();
  const compromissoId = item.compromisso.id;
  const pendentes = useQuery({
    queryKey: vistoriaKeys.pendentes(compromissoId),
    networkMode: 'always',
    queryFn: async () => (await listarMidias()).filter((midia) => midia.compromissoId === compromissoId),
  });
  const camera = useRef<HTMLInputElement>(null);
  const [gravador, setGravador] = useState<MediaRecorder | null>(null);
  const enviadas = item.vistoria.midias.filter((midia) => midia.tipo !== 'signature');
  const fotos = enviadas.filter((midia) => midia.tipo === 'photo').length;

  async function enfileirar(midia: Omit<MidiaPendente, 'compromissoId' | 'midiaId' | 'criadoEm'>) {
    await guardarMidia({ ...midia, compromissoId, midiaId: crypto.randomUUID(), criadoEm: new Date().toISOString() });
    await atualizarPendencias();
    await queryClient.invalidateQueries({ queryKey: vistoriaKeys.pendentes(compromissoId) });
    void sincronizar(queryClient);
  }

  async function adicionarFotos(arquivos: FileList | null) {
    for (const arquivo of [...(arquivos ?? [])]) {
      if (fotos + (pendentes.data?.length ?? 0) >= VISTORIA_MIDIA_LIMITES.photo.maxPorVistoria) {
        toast.error(t('media_limit_reached'));
        break;
      }
      const blob = await prepararFoto(arquivo, item.compromisso.local);
      await enfileirar({ tipo: 'photo', mime: 'image/jpeg', blob });
    }
  }

  async function gravar() {
    if (gravador) {
      gravador.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const partes: Blob[] = [];
      recorder.ondataavailable = (event) => partes.push(event.data);
      recorder.onstop = () => {
        for (const track of stream.getTracks()) track.stop();
        setGravador(null);
        const mime = (recorder.mimeType.split(';')[0] || 'audio/webm') as string;
        void enfileirar({ tipo: 'audio', mime, blob: new Blob(partes, { type: mime }) });
      };
      recorder.start();
      setGravador(recorder);
    } catch {
      toast.error(t('microphone_unavailable'));
    }
  }

  async function removerEnviada(midiaId: string) {
    const res = await del(`/inspections/${compromissoId}/media/${midiaId}`);
    if (!res.success) toast.error(res.message);
    await queryClient.invalidateQueries({ queryKey: vistoriaKeys.detail(compromissoId) });
  }

  async function legendaEnviada(midiaId: string, legenda: string) {
    const res = await patch(`/inspections/${compromissoId}/media/${midiaId}`, { legenda });
    if (!res.success) toast.error(res.message);
  }

  async function legendaPendente(midia: MidiaPendente, legenda: string) {
    await guardarMidia({ ...midia, legenda });
    await queryClient.invalidateQueries({ queryKey: vistoriaKeys.pendentes(compromissoId) });
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
              void adicionarFotos(event.target.files);
              event.target.value = '';
            }}
          />
          <Button type="button" variant="outline" onClick={() => camera.current?.click()}>
            <Camera />
            {t('add_photo')}
          </Button>
          <Button type="button" variant={gravador ? 'destructive' : 'outline'} onClick={() => void gravar()}>
            {gravador ? <Square /> : <Mic />}
            {t(gravador ? 'stop_recording' : 'record_audio')}
          </Button>
        </>
      }
    >
      {!enviadas.length && !pendentes.data?.length ? (
        <ItemTitle className="font-normal text-muted-foreground">{t('no_media_yet')}</ItemTitle>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {pendentes.data?.map((midia) => (
            <li key={midia.midiaId} className="grid gap-2">
              <BlobMidia midia={midia} />
              <ItemDescription className="line-clamp-none">
                {midia.falha ? `${t('upload_failed')}: ${midia.falha}` : t('waiting_to_send')}
              </ItemDescription>
              <div className="flex gap-2">
                <Input
                  aria-label={t('caption')}
                  placeholder={t('caption_placeholder')}
                  defaultValue={midia.legenda ?? ''}
                  onBlur={(event) => void legendaPendente(midia, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('remove')}
                  onClick={async () => {
                    await apagarMidia(midia.midiaId);
                    await atualizarPendencias();
                    await pendentes.refetch();
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
          {enviadas.map((midia) => {
            const src = apiUrl(`/inspections/${compromissoId}/media/${midia.id}`);
            return (
              <li key={midia.id} className="grid gap-2">
                {midia.tipo === 'audio' ? (
                  // biome-ignore lint/a11y/useMediaCaption: gravação da vistoria, sem legenda
                  <audio controls src={src} className="w-full" />
                ) : (
                  <img src={src} alt={midia.legenda ?? ''} className="h-auto w-full rounded-md" />
                )}
                <div className="flex gap-2">
                  <Input
                    aria-label={t('caption')}
                    placeholder={t('caption_placeholder')}
                    defaultValue={midia.legenda ?? ''}
                    onBlur={(event) => void legendaEnviada(midia.id, event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('remove')}
                    onClick={() => void removerEnviada(midia.id)}
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
