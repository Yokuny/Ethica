import { Button } from '@ethica/ui/components/button';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Label } from '@ethica/ui/components/label';
import { ImagePlus, Trash2 } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/form-dialog.js';
import { apiUrl } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { preparePhoto } from '@/lib/offline/photo.js';
import type { PhotoEditor } from './rich-text-editor.js';

const PER_GRID = 6;

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 2 columns × 3 rows with the grid title on top and the caption under each photo (LMO-05); past 6
// photos, another grid. A plain table, which the API allowlist, the PDF and the Word already draw.
export const photoGridHtml = (title: string, photos: PhotoEditor[]): string => {
  const grids: string[] = [];
  for (let start = 0; start < photos.length; start += PER_GRID) {
    const chunk = photos.slice(start, start + PER_GRID);
    const rows: string[] = [];
    for (let i = 0; i < chunk.length; i += 2) {
      const cells = [chunk[i], chunk[i + 1]].map((photo) =>
        photo
          ? `<td><img src="${apiUrl(photo.src)}" alt="${escapeHtml(photo.caption ?? '')}"><p>${escapeHtml(photo.caption ?? '')}</p></td>`
          : '<td><p></p></td>',
      );
      rows.push(`<tr>${cells.join('')}</tr>`);
    }
    grids.push(`<table><tbody><tr><th colspan="2">${escapeHtml(title)}</th></tr>${rows.join('')}</tbody></table>`);
  }
  return grids.join('');
};

type PhotoGridDialogProps = {
  // Inspection photos of the case, to pick (AD-129).
  photos: PhotoEditor[];
  // Sends a new photo to the report and returns its `src`.
  upload: (photo: Blob) => Promise<string>;
  onInsert: (html: string) => void;
  onClose: () => void;
};

export function PhotoGridDialog({ photos, upload, onInsert, onClose }: PhotoGridDialogProps) {
  const [title, setTitle] = useState(t('photo_record'));
  const [chosen, setChosen] = useState<PhotoEditor[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const available = photos.filter((photo) => !chosen.some((item) => item.src === photo.src));

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    setSending(true);
    try {
      for (const file of files) {
        const src = await upload(await preparePhoto(file, null));
        setChosen((current) => [...current, { src, caption: '' }]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('action_error'));
    } finally {
      setSending(false);
    }
  }

  return (
    <FormDialog size="lg" title={t('photo_grid')} description={t('photo_grid_description')} onClose={onClose}>
      <div className="grid gap-2">
        <Label htmlFor="photo-grid-title">{t('title')}</Label>
        <Input id="photo-grid-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      {chosen.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {chosen.map((photo, index) => (
            <li key={photo.src} className="flex flex-col gap-2 rounded-md border p-2">
              <img src={apiUrl(photo.src)} alt={photo.caption ?? ''} className="h-36 w-full rounded-sm object-cover" />
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`${t('caption')} ${index + 1}`}
                  placeholder={t('caption')}
                  value={photo.caption ?? ''}
                  onChange={(event) =>
                    setChosen((current) =>
                      current.map((item) => (item.src === photo.src ? { ...item, caption: event.target.value } : item)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('remove')}
                  onClick={() => setChosen((current) => current.filter((item) => item.src !== photo.src))}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <ItemTitle>{t('inspection_photos')}</ItemTitle>
        {available.length ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {available.map((photo, index) => (
              <li key={photo.src}>
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-sm border hover:ring-2 hover:ring-ring"
                  aria-label={`${t('add')} ${photo.caption || `${t('photo')} ${index + 1}`}`}
                  onClick={() => setChosen((current) => [...current, photo])}
                >
                  <img src={apiUrl(photo.src)} alt={photo.caption ?? ''} className="h-20 w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ItemDescription>{t('no_inspection_photos')}</ItemDescription>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label={t('send_photos')}
        onChange={handleFiles}
      />
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" disabled={sending} onClick={() => inputRef.current?.click()}>
          <ImagePlus />
          {sending ? t('sending') : t('send_photos')}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={!chosen.length || sending}
            onClick={() => onInsert(photoGridHtml(title, chosen))}
          >
            {t('insert')}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
