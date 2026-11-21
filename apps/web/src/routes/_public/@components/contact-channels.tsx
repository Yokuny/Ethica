import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { t } from '@/lib/helpers/translate.helper.js';
import { CONTACT_CHANNELS } from '../@consts/faq.js';

export function ContactChannels() {
  if (!CONTACT_CHANNELS.length) {
    return <ItemDescription className="line-clamp-none text-base">{t('contact_channels_soon')}</ItemDescription>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CONTACT_CHANNELS.map((channel) => (
        <a
          key={channel.href}
          href={channel.href}
          className="flex flex-col gap-1 rounded-lg border p-4 hover:bg-muted/50"
        >
          <ItemTitle>{channel.label}</ItemTitle>
          <ItemDescription>{channel.value}</ItemDescription>
        </a>
      ))}
    </div>
  );
}
