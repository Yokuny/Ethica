import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ethica/ui/components/collapsible';
import { ItemDescription } from '@ethica/ui/components/item';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// Progressive disclosure (AD-255): the exact values month by month stay one click below the chart.
export function MonthDetails({ children }: { children: ReactNode }) {
  return (
    <Collapsible className="flex flex-col gap-4">
      <CollapsibleTrigger className="group/details flex w-fit items-center gap-1.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/25">
        <ChevronDown
          aria-hidden
          className="size-4 text-muted-foreground transition-transform group-data-[panel-open]/details:rotate-180"
        />
        <ItemDescription className="text-foreground">{t('see_month_by_month')}</ItemDescription>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
