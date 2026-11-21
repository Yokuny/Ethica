import { t } from '@/lib/helpers/translate.helper.js';

// Questions about plans and payment: the plans page and the support page. `trial`: only while the trial
// is offered.
export const BILLING_FAQ = [
  { question: t('billing_faq_trial_q'), answer: t('billing_faq_trial_a'), trial: true },
  { question: t('billing_faq_access_q'), answer: t('billing_faq_access_a') },
  { question: t('billing_faq_grace_q'), answer: t('billing_faq_grace_a') },
  { question: t('billing_faq_methods_q'), answer: t('billing_faq_methods_a') },
  { question: t('billing_faq_cancel_q'), answer: t('billing_faq_cancel_a') },
];

// Questions about using the Ethica, only on the support page.
export const USE_FAQ = [
  { question: t('support_faq_sign_in_q'), answer: t('support_faq_sign_in_a') },
  { question: t('support_faq_devices_q'), answer: t('support_faq_devices_a') },
  { question: t('support_faq_team_q'), answer: t('support_faq_team_a') },
  { question: t('support_faq_offline_q'), answer: t('support_faq_offline_a') },
];
