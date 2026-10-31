import * as accountService from '../identity/account.service.js';
import type { PericiaResumo } from '../pericia/pericia.schema.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as prazoService from '../pericia/prazo.service.js';
import * as compromissoRepository from './compromisso.repository.js';
import type { CompromissoRecord } from './compromisso.schema.js';
import type { FeedEntrada } from './feed.schema.js';

// Janela do feed: o calendário externo guarda o passado recente e o ano à frente.
const DIAS_PASSADOS = 60;
const DIAS_FUTUROS = 365;

const TIPO_LABEL: Record<CompromissoRecord['tipo'], string> = {
  inspection: 'Vistoria',
  hearing: 'Audiência',
  meeting: 'Reunião',
  other: 'Outro',
};

// RFC 5545 §3.3.11: texto escapa `\`, `;`, `,` e quebra de linha.
const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545 §3.1: linha com mais de 75 octetos é dobrada; a continuação começa com espaço.
// Corta por octeto sem partir caractere multibyte (acentos são comuns aqui).
const foldLine = (line: string): string => {
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
};

const utcStamp = (instant: Date): string =>
  instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const dateValue = (day: string): string => day.replace(/-/g, '');
const nextDay = (day: string): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const descricao = (tipo: string, titulo: string, resumo?: PericiaResumo, observacoes?: string): string => {
  const partes = resumo && (resumo.autor || resumo.reu) ? [resumo.autor, resumo.reu].filter(Boolean).join(' × ') : '';
  return [
    `Tipo: ${tipo}`,
    `Título: ${titulo}`,
    resumo ? `Processo: ${resumo.numeroProcesso}` : '',
    partes ? `Partes: ${partes}` : '',
    observacoes ? `Observações: ${observacoes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

// Monta o calendário (função pura, testada à parte). Cada evento leva data, descrição
// (tipo, título, processo, partes, observações) e local — definido pelo usuário em 2026-10-31.
export const montarIcs = ({ compromissos, prazos, resumos, now }: FeedEntrada): string => {
  const stamp = utcStamp(now);
  const events = [
    ...compromissos.map((item) => {
      const resumo = item.periciaId ? resumos.get(item.periciaId) : undefined;
      return [
        'BEGIN:VEVENT',
        `UID:compromisso-${item.id}@ethica`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utcStamp(item.inicio)}`,
        `DTEND:${utcStamp(item.fim)}`,
        `SUMMARY:${escapeText(item.titulo)}`,
        `DESCRIPTION:${escapeText(descricao(TIPO_LABEL[item.tipo], item.titulo, resumo, item.observacoes))}`,
        ...(item.local ? [`LOCATION:${escapeText(item.local)}`] : []),
        `STATUS:${item.status === 'done' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
      ];
    }),
    // Prazo é um dia (AD-103): evento de dia inteiro, DTEND exclusivo no dia seguinte, sem local.
    ...prazos.map((prazo) => [
      'BEGIN:VEVENT',
      `UID:prazo-${prazo.id}@ethica`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(prazo.vencimento)}`,
      `DTEND;VALUE=DATE:${dateValue(nextDay(prazo.vencimento))}`,
      `SUMMARY:${escapeText(`Prazo: ${prazo.titulo}`)}`,
      `DESCRIPTION:${escapeText(descricao('Prazo', prazo.titulo, resumos.get(prazo.periciaId), prazo.observacoes))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ]),
  ];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ethica//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Ethica',
    ...events.flat(),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
};

// Feed por token (PRZ-03): `null` quando o link não existe, foi revogado, o usuário está
// inativo ou o tenant suspenso. Compromissos não cancelados da janela + prazos pendentes.
export const gerarFeed = async (token: string, now: Date = new Date()): Promise<string | null> => {
  const owner = await accountService.findFeedOwner(token);
  if (!owner) return null;
  const { tenantId } = owner;
  const [compromissos, prazos] = await Promise.all([
    compromissoRepository.listInRange(tenantId, {
      from: new Date(now.getTime() - DIAS_PASSADOS * 86_400_000),
      to: new Date(now.getTime() + DIAS_FUTUROS * 86_400_000),
    }),
    prazoService.listPrazosPendentes(tenantId),
  ]);
  const ativos = compromissos.filter((item) => item.status !== 'canceled');
  const ids = [
    ...new Set([
      ...ativos.flatMap((item) => (item.periciaId ? [item.periciaId] : [])),
      ...prazos.map((p) => p.periciaId),
    ]),
  ];
  const resumos = await periciaService.findResumosByIds(tenantId, ids);
  return montarIcs({ compromissos: ativos, prazos, resumos, now });
};
