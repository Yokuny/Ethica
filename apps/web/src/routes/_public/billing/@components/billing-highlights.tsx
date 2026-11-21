import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { CreditCardIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';

const HIGHLIGHTS = [
  { icon: CreditCardIcon, title: t('billing_highlight_methods_title'), text: t('billing_highlight_methods_text') },
  { icon: ShieldCheckIcon, title: t('billing_highlight_grace_title'), text: t('billing_highlight_grace_text') },
  { icon: UsersIcon, title: t('billing_highlight_team_title'), text: t('billing_highlight_team_text') },
];

// The blocks under the cards in the Vercel model: what holds for every plan, before the comparison.
export function BillingHighlights() {
  return (
    <div className="grid divide-y rounded-xl border md:grid-cols-3 md:divide-x md:divide-y-0">
      {HIGHLIGHTS.map((highlight) => (
        <div key={highlight.title} className="flex flex-col gap-3 p-6">
          <highlight.icon className="size-5 text-primary" aria-hidden />
          <ItemTitle className="text-base font-semibold">{highlight.title}</ItemTitle>
          <ItemDescription className="line-clamp-none">{highlight.text}</ItemDescription>
        </div>
      ))}
    </div>
  );
}
