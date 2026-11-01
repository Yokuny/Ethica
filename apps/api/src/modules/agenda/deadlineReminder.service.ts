import { DEADLINE_DUE_SOON_DAYS } from '@ethica/contracts';
import { dateInDisplayTz, wallClockToUtc } from '@ethica/db';
import type { MailProvider } from '../../providers/mail/index.js';
import type { CaseSummary } from '../case/case.schema.js';
import * as caseService from '../case/case.service.js';
import type { NoticeDeadline } from '../case/deadline.schema.js';
import * as deadlineService from '../case/deadline.service.js';
import * as accountService from '../identity/account.service.js';

// Consolidado diário às 07:00 de São Paulo (AD-110, AD-036).
const HORA_DO_AVISO = '07:00';

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDay = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

// Próximo 07:00 de São Paulo depois de `now` (instante UTC, offset resolvido na data alvo).
export const proximaExecucao = (now: Date): Date => {
  const today = dateInDisplayTz(now);
  const hoje = wallClockToUtc(today, HORA_DO_AVISO);
  return hoje > now ? hoje : wallClockToUtc(addDays(today, 1), HORA_DO_AVISO);
};

const montarEmail = (
  secoes: { titulo: string; deadlines: NoticeDeadline[] }[],
  resumos: Map<string, CaseSummary>,
  appUrl: string,
): string =>
  secoes
    .filter((secao) => secao.deadlines.length > 0)
    .map((secao) => {
      const itens = secao.deadlines
        .map((deadline) => {
          const numero = resumos.get(deadline.caseId)?.processNumber ?? '';
          const link = `${appUrl}/expert-cases/details?id=${encodeURIComponent(deadline.caseId)}`;
          return `<li><a href="${escapeHtml(link)}">${escapeHtml(deadline.titulo)}</a> — ${escapeHtml(numero)} (${formatDay(deadline.vencimento)})</li>`;
        })
        .join('');
      return `<h3>${escapeHtml(secao.titulo)}</h3><ul>${itens}</ul>`;
    })
    .join('');

// PRZ-04: um e-mail por pessoa com os prazos pendentes que vencem em 15 dias, hoje e
// ontem. Prazo protocolado ou perdido não aparece (a consulta só traz pendentes); quem
// desligou o aviso, usuário inativo e tenant suspenso não recebem (AD-110, AD-098).
export const sendDeadlineNotices = async (
  deps: { mail: MailProvider; appUrl: string },
  now: Date = new Date(),
): Promise<{ enviados: number }> => {
  const hoje = dateInDisplayTz(now);
  const soon = addDays(hoje, DEADLINE_DUE_SOON_DAYS);
  const ontem = addDays(hoje, -1);
  const deadlines = await deadlineService.listDeadlinesToNotice([soon, hoje, ontem]);
  if (deadlines.length === 0) return { enviados: 0 };

  const porTenant = new Map<string, NoticeDeadline[]>();
  for (const deadline of deadlines)
    porTenant.set(deadline.tenantId, [...(porTenant.get(deadline.tenantId) ?? []), deadline]);
  const destinatarios = await accountService.listDeadlineReminderRecipients([...porTenant.keys()]);

  let enviados = 0;
  for (const [tenantId, doTenant] of porTenant) {
    const pessoas = destinatarios.filter((pessoa) => pessoa.tenantId === tenantId);
    if (pessoas.length === 0) continue;
    const resumos = await caseService.findResumosByIds(tenantId, [...new Set(doTenant.map((p) => p.caseId))]);
    const html = montarEmail(
      [
        { titulo: 'Venceram ontem', deadlines: doTenant.filter((p) => p.vencimento === ontem) },
        { titulo: 'Vencem hoje', deadlines: doTenant.filter((p) => p.vencimento === hoje) },
        {
          titulo: `Vencem em ${DEADLINE_DUE_SOON_DAYS} dias`,
          deadlines: doTenant.filter((p) => p.vencimento === soon),
        },
      ],
      resumos,
      deps.appUrl,
    );
    for (const pessoa of pessoas) {
      const { sent } = await deps.mail.send(pessoa.email, `Prazos das perícias — ${formatDay(hoje)}`, html);
      if (sent) enviados += 1;
    }
  }
  return { enviados };
};
