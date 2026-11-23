import { CustomError } from '../../middlewares/error-handler.middleware.js';
import type { ContactMessage, ContactRouterDeps, ContactSubject } from './contact.schema.js';

// AD-249: the message goes by e-mail to the Ethica inbox (never to an address of the form) and is not stored.

const SUBJECT_LABELS: Record<ContactSubject, string> = {
  plans: 'Planos e pagamento',
  support: 'Suporte',
  suggestion: 'Sugestão',
  partnership: 'Parcerias',
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const send = async (deps: ContactRouterDeps, message: ContactMessage): Promise<void> => {
  if (!deps.inbox) throw new CustomError('contact_not_configured', 503);
  const field = (label: string, value: string) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`;
  const { sent } = await deps.mailProvider.send(
    deps.inbox,
    `Contato pelo site: ${SUBJECT_LABELS[message.subject]}`,
    `${field('Nome', message.name)}${field('E-mail', message.email)}${field('Telefone', message.phone)}${field('Assunto', SUBJECT_LABELS[message.subject])}
<p style="white-space: pre-wrap">${escapeHtml(message.message)}</p>`,
  );
  if (!sent) throw new CustomError('email_send_failed', 502);
};
