'use client';

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

// Port of the iotlog-frontend-v2 shadcn collapsible (Radix) to Base UI: Radix
// `CollapsibleContent` is `Collapsible.Panel` here, and `asChild` becomes
// `render`. No style: whoever uses it (apps/web/src/components/record.tsx) draws it.
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
