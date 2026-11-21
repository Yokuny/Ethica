import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ethica/ui/components/collapsible';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ChevronDownIcon } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import { FAQ } from '../@consts/plans.js';

export function BillingFaq({ trialAvailable }: { trialAvailable: boolean }) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
        render={<h3 />}
        className="mx-auto justify-center text-2xl font-medium tracking-tight"
      >
        {t('billing_faq_title')}
      </ItemTitle>
      <div className="divide-y border-y">
        {FAQ.filter((item) => !item.trial || trialAvailable).map((item) => (
          <Collapsible key={item.question}>
            <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left">
              <ItemTitle>{item.question}</ItemTitle>
              <ChevronDownIcon
                className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pb-4">
              <ItemDescription className="line-clamp-none">{item.answer}</ItemDescription>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}
