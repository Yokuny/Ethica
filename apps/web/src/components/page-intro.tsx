import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// Hub page intro: page title and description, then a card
// with the illustration, what the screen allows and the features it covers. The card
// height is fixed (mobile and desktop) to look the same on every hub page.
export function PageIntro({
  title,
  description,
  illustration,
  heading,
  text,
  features,
}: {
  title: ReactNode;
  description: ReactNode;
  illustration: ReactNode;
  heading: ReactNode;
  text: ReactNode;
  features: { icon: LucideIcon; label: string }[];
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <ItemTitle className="text-3xl tracking-tight text-balance sm:text-4xl">{title}</ItemTitle>
        <ItemDescription className="line-clamp-none max-w-5xl text-base">{description}</ItemDescription>
      </div>
      <div className="grid min-h-152 content-center items-center gap-6 rounded-2xl border bg-card p-6 sm:p-8 lg:h-80 lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
        <div aria-hidden>{illustration}</div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <ItemTitle className="text-2xl tracking-tight text-balance sm:text-3xl">{heading}</ItemTitle>
            <ItemDescription className="line-clamp-none max-w-3xl text-base">{text}</ItemDescription>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-1.5">
                <Icon aria-hidden />
                <ItemDescription>{label}</ItemDescription>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
