import type { LucideIcon } from 'lucide-react';

// Default illustration of the hubs' `PageIntro`: the module icon over layered
// tiles. Replace it with a custom illustration when the module has one.
export function HubIllustration({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="relative mx-auto grid size-48 place-items-center">
      <span className="absolute inset-6 rotate-6 rounded-3xl border bg-muted/60" />
      <span className="absolute inset-10 -rotate-3 rounded-3xl border bg-background shadow-xs" />
      <Icon className="relative size-14 text-muted-foreground" strokeWidth={1.5} />
    </div>
  );
}
