import type { MailProvider } from '../../providers/mail/index.js';

export type { ContactMessage, ContactSubject } from '@ethica/contracts';
export { contactMessageSchema } from '@ethica/contracts';

// `inbox` absent = CONTACT_EMAIL not configured: sending answers `contact_not_configured`.
export type ContactRouterDeps = { mailProvider: MailProvider; inbox?: string };
