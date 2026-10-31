import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useRef } from 'react';
import { apiUrl } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useLogoUpload } from '../@hooks/use-logo-upload.js';

export function OfficeLogo({ logo }: { logo?: string }) {
  const { handleFile, remove, isPending } = useLogoUpload();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-start gap-3">
      {logo ? (
        <img src={apiUrl(logo)} alt={t('logo')} className="max-h-20 max-w-60 object-contain" />
      ) : (
        <ItemDescription>{t('no_logo_yet')}</ItemDescription>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={isPending} onClick={() => input.current?.click()}>
          {t(logo ? 'change_logo' : 'choose_logo')}
        </Button>
        {logo && (
          <Button variant="ghost" disabled={isPending} onClick={remove}>
            {t('remove')}
          </Button>
        )}
      </div>
    </div>
  );
}
