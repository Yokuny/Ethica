import { Badge } from '@ethica/ui/components/badge';
import { ItemDescription } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PublicDocument } from '../@components/public-document.js';
import { NEWS } from './@consts/news.js';

export function NewsPage() {
  return (
    <PublicDocument
      title={t('news')}
      description={t('news_description')}
      sections={NEWS.map((item) => ({
        title: item.title,
        children: (
          <div className="flex flex-col items-start gap-2">
            <Badge variant="neutral">{formatDate(item.date)}</Badge>
            <ItemDescription className="line-clamp-none text-base">{item.text}</ItemDescription>
          </div>
        ),
      }))}
    />
  );
}

export const Route = createFileRoute('/_public/news/')({
  component: NewsPage,
  staticData: { title: t('news') },
});
