import { CONTACT_SUBJECTS, type ContactMessage, type ContactSubject } from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

const SUBJECT_LABELS: Record<ContactSubject, string> = {
  plans: t('support_billing_title'),
  support: t('support'),
  suggestion: t('suggestion'),
  partnership: t('partnerships'),
};

export const SUBJECT_ITEMS = CONTACT_SUBJECTS.map((value) => ({ value, label: SUBJECT_LABELS[value] }));

export const CONTACT_DEFAULTS: ContactMessage = { name: '', email: '', phone: '', subject: 'support', message: '' };
