import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { FaqList } from '../../@components/faq-list.js';
import { BILLING_FAQ } from '../../@consts/faq.js';

// "Need help?" of the shadcnblocks model: the call to the support beside the questions.
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
        <ItemDescription className="line-clamp-none text-lg md:text-xl">
          {`${t('billing_help_text')} `}
          <Link to="/contact" className="whitespace-nowrap text-foreground underline">
            {t('contact')}
          </Link>
        </ItemDescription>
      </div>
      <FaqList items={BILLING_FAQ.filter((item) => !item.trial || trialAvailable)} />
    </div>
  );
}
