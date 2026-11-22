import { DUE_SOON_DAYS, FINANCE_DUE_SOON_DAYS, hasPermission, wantsChannel } from '@ethica/contracts';
import {
  caseLabelsByIds,
  type DeliveryRecipient,
  type DueItem,
  dateInDisplayTz,
  type FinanceDueItem,
  listDeliveryRecipients,
  listFinanceDueUntil,
  listPendingDueOn,
  listPushSubscriptions,
} from '@ethica/db';
import type { MailProvider } from '@ethica/mail';
import type { PushSender } from '../push.js';
import { deliverOnce } from '../queue/delivery-lock.js';
import { addDays, escapeHtml, formatDay, formatMoney } from './format.js';

// Daily digest (AD-110, AD-267, CNT-02): one e-mail per person with the pending deadlines and alerts due in
// 15 days, today and yesterday (who sees cases) and the open transactions due in 7 days, today or overdue
// (who sees finance, AVS-02), each part as the person's preferences say. It tells the current state: an
// overdue transaction comes back every day until it is paid. The lock `digest:<day>` sends once per day.

type Section = { title: string; items: string[] };

const htmlOf = (sections: Section[]): string =>
  sections
    .filter((section) => section.items.length > 0)
    .map((section) => `<h3>${escapeHtml(section.title)}</h3><ul>${section.items.join('')}</ul>`)
    .join('');

const deadlineSections = (
  items: DueItem[],
  labels: Map<string, string>,
  days: { today: string; yesterday: string; soon: string },
  appUrl: string,
): Section[] => {
  const line = (item: DueItem) => {
    const link = `${appUrl}/expert-cases/details?id=${encodeURIComponent(item.caseId)}`;
    return `<li><a href="${escapeHtml(link)}">${escapeHtml(item.title)}</a> — ${escapeHtml(labels.get(item.caseId) ?? '')} (${formatDay(item.dueDate)})</li>`;
  };
  return [
    { title: 'Venceram ontem', items: items.filter((item) => item.dueDate === days.yesterday).map(line) },
    { title: 'Vencem hoje', items: items.filter((item) => item.dueDate === days.today).map(line) },
    { title: `Vencem em ${DUE_SOON_DAYS} dias`, items: items.filter((item) => item.dueDate === days.soon).map(line) },
  ];
};

const financeSections = (items: FinanceDueItem[], days: { today: string; soon: string }, appUrl: string): Section[] => {
  const line = (item: FinanceDueItem) => {
    const link = `${appUrl}/finance${item.caseId ? `?caseId=${encodeURIComponent(item.caseId)}` : ''}`;
    const kind = item.kind === 'income' ? 'A receber' : 'A pagar';
    return `<li><a href="${escapeHtml(link)}">${escapeHtml(item.description)}</a> — ${kind} ${formatMoney(item.openCents)} (${formatDay(item.dueDate)})</li>`;
  };
  return [
    { title: 'Lançamentos atrasados', items: items.filter((item) => item.dueDate < days.today).map(line) },
    { title: 'Lançamentos que vencem hoje', items: items.filter((item) => item.dueDate === days.today).map(line) },
    {
      title: `Lançamentos que vencem em ${FINANCE_DUE_SOON_DAYS} dias`,
      items: items.filter((item) => item.dueDate === days.soon).map(line),
    },
  ];
};

const byTenant = <T extends { tenantId: string }>(items: T[]): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(item.tenantId, [...(map.get(item.tenantId) ?? []), item]);
  return map;
};

const wants = (person: DeliveryRecipient, topic: 'deadlines' | 'finance', channel: 'email' | 'push' = 'email') =>
  hasPermission(person.permissions, topic === 'deadlines' ? 'expert_cases' : 'finance', 'view') &&
  wantsChannel(person.preferences, topic, channel);

// Push of the day (AVS-03): only counts, never an amount nor a party name.
const pushBody = (deadlines: number, finance: number): string =>
  [
    deadlines ? `${deadlines} ${deadlines === 1 ? 'prazo ou alerta' : 'prazos e alertas'}` : '',
    finance ? `${finance} ${finance === 1 ? 'lançamento' : 'lançamentos'}` : '',
  ]
    .filter(Boolean)
    .join(' e ');

export const sendDigest = async (
  deps: { mail: MailProvider; appUrl: string; push?: PushSender },
  now: Date = new Date(),
): Promise<{ sent: number }> => {
  const today = dateInDisplayTz(now);
  const days = { today, yesterday: addDays(today, -1), soon: addDays(today, DUE_SOON_DAYS) };
  const financeSoon = addDays(today, FINANCE_DUE_SOON_DAYS);
  const [deadlines, finance] = await Promise.all([
    listPendingDueOn([days.soon, today, days.yesterday]),
    listFinanceDueUntil(financeSoon),
  ]);
  const financeDue = finance.filter((item) => item.dueDate <= today || item.dueDate === financeSoon);
  const deadlinesByTenant = byTenant(deadlines);
  const financeByTenant = byTenant(financeDue);
  const tenantIds = [...new Set([...deadlinesByTenant.keys(), ...financeByTenant.keys()])];
  if (tenantIds.length === 0) return { sent: 0 };
  const recipients = await listDeliveryRecipients(tenantIds, now);
  const devices = deps.push ? await listPushSubscriptions(recipients.map((person) => person.userId)) : new Map();

  let sent = 0;
  for (const tenantId of tenantIds) {
    const people = recipients.filter((person) => person.tenantId === tenantId);
    if (people.length === 0) continue;
    const tenantDeadlines = deadlinesByTenant.get(tenantId) ?? [];
    const labels = await caseLabelsByIds(tenantId, [...new Set(tenantDeadlines.map((item) => item.caseId))]);
    const deadlineHtml = htmlOf(deadlineSections(tenantDeadlines, labels, days, deps.appUrl));
    const financeHtml = htmlOf(
      financeSections(financeByTenant.get(tenantId) ?? [], { today, soon: financeSoon }, deps.appUrl),
    );
    const deadlineCount = tenantDeadlines.length;
    const financeCount = (financeByTenant.get(tenantId) ?? []).length;
    for (const person of people) {
      const subscriptions = devices.get(person.userId) ?? [];
      const body = pushBody(
        wants(person, 'deadlines', 'push') ? deadlineCount : 0,
        wants(person, 'finance', 'push') ? financeCount : 0,
      );
      if (deps.push && subscriptions.length && body) {
        const push = deps.push;
        await deliverOnce(
          { tenantId, userId: person.userId, channel: 'push', key: `digest:${today}` },
          () => push.send(subscriptions, { title: 'Ethica', body: `Hoje: ${body}.`, url: '/notifications' }),
          now,
        );
      }
      const html = [wants(person, 'deadlines') ? deadlineHtml : '', wants(person, 'finance') ? financeHtml : '']
        .filter(Boolean)
        .join('');
      if (!html) continue;
      const result = await deliverOnce(
        { tenantId, userId: person.userId, channel: 'email', key: `digest:${today}` },
        () => deps.mail.send(person.email, `Avisos do Ethica — ${formatDay(today)}`, html),
        now,
      );
      if (result === 'sent') sent += 1;
    }
  }
  return { sent };
};
