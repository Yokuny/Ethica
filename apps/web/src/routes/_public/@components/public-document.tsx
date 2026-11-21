import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PublicNav } from './public-nav.js';

export type DocumentSection = { title: string; text?: string; children?: ReactNode };

type PublicDocumentProps = {
  title: string;
  description: string;
  // Terms and privacy: sections still without the final text (written by the office lawyer).
  draft?: boolean;
  sections: DocumentSection[];
};

// Text page of the public footer (security, support, news, terms…): the bar, the title and the sections.
export function PublicDocument({ title, description, draft, sections }: PublicDocumentProps) {
  return (
    <Card>
      <CardContent className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <PublicNav />
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <div className="flex flex-col gap-4">
            <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
              render={<h1 />}
              className="text-4xl font-semibold tracking-tight lg:text-5xl"
            >
              {title}
            </ItemTitle>
            <ItemDescription className="line-clamp-none text-lg">{description}</ItemDescription>
            {draft && (
              <ItemDescription className="line-clamp-none rounded-md border bg-muted/50 p-3">
                {t('document_draft_notice')}
              </ItemDescription>
            )}
          </div>
          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                render={<h2 />}
                className="text-xl font-semibold"
              >
                {section.title}
              </ItemTitle>
              {section.text && <ItemDescription className="line-clamp-none text-base">{section.text}</ItemDescription>}
              {section.children}
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
