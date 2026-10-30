import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { ImageUp, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { UserAvatar } from '@/components/user-chip.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useAvatarUpload } from '../@hooks/use-avatar-upload.js';

export function AccountPhoto({ name, avatar }: { name: string; avatar?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleFile, remove, isPending } = useAvatarUpload();
  return (
    <div className="flex flex-wrap items-center gap-6">
      <UserAvatar name={name} avatar={avatar} size="xl" shape="square" />
      <div className="flex flex-col items-start gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
            <ImageUp />
            {t('choose_photo')}
          </Button>
          {avatar && (
            <Button type="button" variant="ghost" disabled={isPending} onClick={remove}>
              <Trash2 />
              {t('remove_photo')}
            </Button>
          )}
        </div>
        <ItemDescription className="line-clamp-none">{t('photo_format_hint')}</ItemDescription>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label={t('choose_photo')}
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
