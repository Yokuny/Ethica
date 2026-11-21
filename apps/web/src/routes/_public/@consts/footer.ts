import { t } from '@/lib/helpers/translate.helper.js';

// Footer columns of every public page (shadcnblocks model of the plans page).
export const FOOTER_SECTIONS = [
  {
    title: t('product'),
    links: [
      { to: '/news', label: t('news') },
      { to: '/security', label: t('security') },
    ],
  },
  {
    title: t('help'),
    links: [
      { to: '/support', label: t('support') },
      { to: '/contact', label: t('contact') },
    ],
  },
  {
    title: t('legal'),
    links: [
      { to: '/terms', label: t('terms_of_use') },
      { to: '/privacy', label: t('privacy_policy') },
    ],
  },
] as const;
