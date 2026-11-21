import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ethica/ui/components/collapsible';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ChevronDownIcon } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import { FAQ } from '../@consts/plans.js';

// "Need help?" of the shadcnblocks model (pricing.html): the call to the support beside the questions.
export function BillingFaq({ trialAvailable }: { trialAvailable: boolean }) {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
          render={<h3 />}
          className="flex-col items-start gap-0 text-4xl font-semibold"
        >
          {t('billing_help_title')}
          <span className="text-muted-foreground/70">{t('billing_help_subtitle')}</span>
        </ItemTitle>
        <ItemDescription className="line-clamp-none text-lg md:text-xl">{t('billing_help_text')}</ItemDescription>
      </div>
      <div className="flex flex-col">
        {FAQ.filter((item) => !item.trial || trialAvailable).map((item) => (
          <Collapsible key={item.question} className="not-last:border-b">
            <CollapsibleTrigger className="group flex w-full cursor-pointer items-start justify-between gap-4 py-4 text-left hover:underline">
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
    </div>
  );
}
