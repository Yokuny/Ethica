import { hasPermission, type NotificationPreferenceTopic, wantsChannel } from '@ethica/contracts';
import { findNoticeForDelivery, listDeliveryRecipients } from '@ethica/db';
import type { MailProvider } from '@ethica/mail';
import { deliverOnce } from '../queue/delivery-lock.js';
import { escapeHtml, formatDay, formatMoney } from './format.js';

// Right-away e-mail of a `critical` notification (CNT-02): the lock `immediate:<id>` sends it once per person.
// Its producer is the automation (the alvará suggestion, Fase 6); the texts follow the topic.

const PREFERENCE_OF_TOPIC: Record<string, NotificationPreferenceTopic> = {
  finance_due: 'finance',
  automation_expiring: 'finance',
};

const textOf = (topic: string | undefined, params: Record<string, string | number> = {}): string | undefined => {
  if (topic === 'finance_due') {
    return `${escapeHtml(String(params.description ?? ''))} — ${formatMoney(Number(params.openCents ?? 0))} (${formatDay(String(params.dueDate ?? ''))})`;
  }
  if (topic === 'automation_expiring') {
    return `A Automação Datajud termina em ${formatDay(String(params.automationUntil ?? '').slice(0, 10))}. Renove o plano para continuar acompanhando os processos.`;
  }
  return undefined;
};

export const sendImmediate = async (
  deps: { mail: MailProvider; appUrl: string },
  notificationId: string,
  now: Date = new Date(),
): Promise<{ sent: number }> => {
  const notice = await findNoticeForDelivery(notificationId);
  const text = notice && textOf(notice.topic, notice.params);
  if (!notice || !text) return { sent: 0 };
  const preference = PREFERENCE_OF_TOPIC[notice.topic ?? ''] ?? 'suggestions';
  const people = (await listDeliveryRecipients([notice.tenantId], now)).filter(
    (person) =>
      hasPermission(person.permissions, notice.module, 'view') && wantsChannel(person.preferences, preference, 'email'),
  );
  const html = `<p>${text}</p><p><a href="${escapeHtml(`${deps.appUrl}/notifications`)}">Abrir as notificações</a></p>`;
  let sent = 0;
  for (const person of people) {
    const result = await deliverOnce(
      { tenantId: notice.tenantId, userId: person.userId, channel: 'email', key: `immediate:${notice.id}` },
      () => deps.mail.send(person.email, 'Aviso do Ethica', html),
      now,
    );
    if (result === 'sent') sent += 1;
  }
  return { sent };
};
