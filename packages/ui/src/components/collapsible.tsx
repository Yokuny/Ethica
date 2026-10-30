'use client';

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

// Porte do collapsible shadcn do iotlog-frontend-v2 (Radix) para Base UI: o
// `CollapsibleContent` do Radix é o `Collapsible.Panel` aqui, e `asChild` vira
// `render`. Sem estilo: quem usa (apps/web/src/components/record.tsx) desenha.
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
