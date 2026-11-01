import { PRAZO_VENCE_EM_BREVE_DIAS } from '@ethica/contracts';
import { dateInDisplayTz, wallClockToUtc } from '@ethica/db';
import type { MailProvider } from '../../providers/mail/index.js';
import * as accountService from '../identity/account.service.js';
import type { PericiaResumo } from '../pericia/pericia.schema.js';
import * as periciaService from '../pericia/pericia.service.js';
import type { PrazoDoAviso } from '../pericia/prazo.schema.js';
import * as prazoService from '../pericia/prazo.service.js';

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
  secoes: { titulo: string; prazos: PrazoDoAviso[] }[],
  resumos: Map<string, PericiaResumo>,
  appUrl: string,
): string =>
  secoes
    .filter((secao) => secao.prazos.length > 0)
    .map((secao) => {
      const itens = secao.prazos
        .map((prazo) => {
          const numero = resumos.get(prazo.periciaId)?.numeroProcesso ?? '';
          const link = `${appUrl}/expert-cases/details?id=${encodeURIComponent(prazo.periciaId)}`;
          return `<li><a href="${escapeHtml(link)}">${escapeHtml(prazo.titulo)}</a> — ${escapeHtml(numero)} (${formatDay(prazo.vencimento)})</li>`;
        })
        .join('');
      return `<h3>${escapeHtml(secao.titulo)}</h3><ul>${itens}</ul>`;
    })
    .join('');

// PRZ-04: um e-mail por pessoa com os prazos pendentes que vencem em 15 dias, hoje e
// ontem. Prazo protocolado ou perdido não aparece (a consulta só traz pendentes); quem
// desligou o aviso, usuário inativo e tenant suspenso não recebem (AD-110, AD-098).
export const enviarAvisosDePrazo = async (
  deps: { mail: MailProvider; appUrl: string },
  now: Date = new Date(),
): Promise<{ enviados: number }> => {
  const hoje = dateInDisplayTz(now);
  const emBreve = addDays(hoje, PRAZO_VENCE_EM_BREVE_DIAS);
  const ontem = addDays(hoje, -1);
  const prazos = await prazoService.listPrazosParaAviso([emBreve, hoje, ontem]);
  if (prazos.length === 0) return { enviados: 0 };

  const porTenant = new Map<string, PrazoDoAviso[]>();
  for (const prazo of prazos) porTenant.set(prazo.tenantId, [...(porTenant.get(prazo.tenantId) ?? []), prazo]);
  const destinatarios = await accountService.listDestinatariosAvisoPrazo([...porTenant.keys()]);

  let enviados = 0;
  for (const [tenantId, doTenant] of porTenant) {
    const pessoas = destinatarios.filter((pessoa) => pessoa.tenantId === tenantId);
    if (pessoas.length === 0) continue;
    const resumos = await periciaService.findResumosByIds(tenantId, [...new Set(doTenant.map((p) => p.periciaId))]);
    const html = montarEmail(
      [
        { titulo: 'Venceram ontem', prazos: doTenant.filter((p) => p.vencimento === ontem) },
        { titulo: 'Vencem hoje', prazos: doTenant.filter((p) => p.vencimento === hoje) },
        {
          titulo: `Vencem em ${PRAZO_VENCE_EM_BREVE_DIAS} dias`,
          prazos: doTenant.filter((p) => p.vencimento === emBreve),
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
