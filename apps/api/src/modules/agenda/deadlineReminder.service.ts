import { DEADLINE_DUE_SOON_DAYS } from '@ethica/contracts';
import { dateInDisplayTz, wallClockToUtc } from '@ethica/db';
import type { MailProvider } from '../../providers/mail/index.js';
import type { CaseSummary } from '../case/case.schema.js';
import * as caseService from '../case/case.service.js';
import type { NoticeDeadline } from '../case/deadline.schema.js';
import * as deadlineService from '../case/deadline.service.js';
import * as accountService from '../identity/account.service.js';

// Consolidado diário às 07:00 de São Paulo (AD-110, AD-036).
const NOTICE_HOUR = '07:00';

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDay = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

// Próximo 07:00 de São Paulo depois de `now` (instante UTC, offset resolvido na data alvo).
export const nextExecution = (now: Date): Date => {
  const today = dateInDisplayTz(now);
  const at = wallClockToUtc(today, NOTICE_HOUR);
  return at > now ? at : wallClockToUtc(addDays(today, 1), NOTICE_HOUR);
};

const buildEmail = (
  sections: { title: string; deadlines: NoticeDeadline[] }[],
  summaries: Map<string, CaseSummary>,
  appUrl: string,
): string =>
  sections
    .filter((section) => section.deadlines.length > 0)
    .map((section) => {
      const items = section.deadlines
        .map((deadline) => {
          const number = summaries.get(deadline.caseId)?.processNumber ?? '';
          const link = `${appUrl}/expert-cases/details?id=${encodeURIComponent(deadline.caseId)}`;
          return `<li><a href="${escapeHtml(link)}">${escapeHtml(deadline.title)}</a> — ${escapeHtml(number)} (${formatDay(deadline.dueDate)})</li>`;
        })
        .join('');
      return `<h3>${escapeHtml(section.title)}</h3><ul>${items}</ul>`;
    })
    .join('');

// PRZ-04: um e-mail por pessoa com os prazos pendentes que vencem em 15 dias, hoje e
// ontem. Prazo protocolado ou perdido não aparece (a consulta só traz pendentes); quem
// desligou o aviso, usuário inativo e tenant suspenso não recebem (AD-110, AD-098).
export const sendDeadlineNotices = async (
  deps: { mail: MailProvider; appUrl: string },
  now: Date = new Date(),
): Promise<{ sent: number }> => {
  const today = dateInDisplayTz(now);
  const soon = addDays(today, DEADLINE_DUE_SOON_DAYS);
  const ontem = addDays(today, -1);
  const deadlines = await deadlineService.listDeadlinesToNotice([soon, today, ontem]);
  if (deadlines.length === 0) return { sent: 0 };

  const porTenant = new Map<string, NoticeDeadline[]>();
  for (const deadline of deadlines)
    porTenant.set(deadline.tenantId, [...(porTenant.get(deadline.tenantId) ?? []), deadline]);
  const recipients = await accountService.listDeadlineReminderRecipients([...porTenant.keys()]);

  let sentCount = 0;
  for (const [tenantId, doTenant] of porTenant) {
    const pessoas = recipients.filter((person) => person.tenantId === tenantId);
    if (pessoas.length === 0) continue;
    const summaries = await caseService.findSummariesByIds(tenantId, [...new Set(doTenant.map((p) => p.caseId))]);
    const html = buildEmail(
      [
        { title: 'Venceram ontem', deadlines: doTenant.filter((p) => p.dueDate === ontem) },
        { title: 'Vencem hoje', deadlines: doTenant.filter((p) => p.dueDate === today) },
        {
          title: `Vencem em ${DEADLINE_DUE_SOON_DAYS} dias`,
          deadlines: doTenant.filter((p) => p.dueDate === soon),
        },
      ],
      summaries,
      deps.appUrl,
    );
    for (const person of pessoas) {
      const { sent } = await deps.mail.send(person.email, `Prazos das perícias — ${formatDay(today)}`, html);
      if (sent) sentCount += 1;
    }
  }
  return { sent: sentCount };
};
