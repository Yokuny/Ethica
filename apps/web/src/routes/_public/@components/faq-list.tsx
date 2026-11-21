import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ethica/ui/components/collapsible';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ChevronDownIcon } from 'lucide-react';

// Questions that open one by one, as the accordion of the shadcnblocks model.
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item) => (
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
  );
}
