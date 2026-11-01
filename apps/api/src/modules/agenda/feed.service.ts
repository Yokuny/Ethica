import type { CaseSummary } from '../case/case.schema.js';
import * as caseService from '../case/case.service.js';
import * as deadlineService from '../case/deadline.service.js';
import * as accountService from '../identity/account.service.js';
import * as appointmentRepository from './appointment.repository.js';
import type { AppointmentRecord } from './appointment.schema.js';
import type { FeedEntry } from './feed.schema.js';

// Feed window: the external calendar keeps the recent past and the year ahead.
const PAST_DAYS = 60;
const FUTURE_DAYS = 365;

const TYPE_LABEL: Record<AppointmentRecord['type'], string> = {
  inspection: 'Vistoria',
  hearing: 'Audiência',
  meeting: 'Reunião',
  other: 'Outro',
};

// RFC 5545 §3.3.11: text escapes `\`, `;`, `,` and line breaks.
const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545 §3.1: a line longer than 75 octets is folded; the continuation starts with a space.
// Cuts by octet without splitting a multibyte character (accents are common here).
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

const description = (type: string, title: string, summary?: CaseSummary, notes?: string): string => {
  const parties =
    summary && (summary.plaintiff || summary.defendant)
      ? [summary.plaintiff, summary.defendant].filter(Boolean).join(' × ')
      : '';
  return [
    `Tipo: ${type}`,
    `Título: ${title}`,
    summary ? `Processo: ${summary.processNumber}` : '',
    parties ? `Partes: ${parties}` : '',
    notes ? `Observações: ${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

// Builds the calendar (pure function, tested on its own). Each event carries date, description
// (type, title, process, parties, notes) and location — defined by the user on 2026-10-31.
export const buildIcs = ({ appointments, deadlines, summaries, now }: FeedEntry): string => {
  const stamp = utcStamp(now);
  const events = [
    ...appointments.map((item) => {
      const summary = item.caseId ? summaries.get(item.caseId) : undefined;
      return [
        'BEGIN:VEVENT',
        `UID:compromisso-${item.id}@ethica`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utcStamp(item.start)}`,
        `DTEND:${utcStamp(item.end)}`,
        `SUMMARY:${escapeText(item.title)}`,
        `DESCRIPTION:${escapeText(description(TYPE_LABEL[item.type], item.title, summary, item.notes))}`,
        ...(item.location ? [`LOCATION:${escapeText(item.location)}`] : []),
        `STATUS:${item.status === 'done' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
      ];
    }),
    // A deadline is a day (AD-103): all-day event, DTEND exclusive on the next day, no location.
    ...deadlines.map((deadline) => [
      'BEGIN:VEVENT',
      `UID:prazo-${deadline.id}@ethica`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(deadline.dueDate)}`,
      `DTEND;VALUE=DATE:${dateValue(nextDay(deadline.dueDate))}`,
      `SUMMARY:${escapeText(`Prazo: ${deadline.title}`)}`,
      `DESCRIPTION:${escapeText(description('Prazo', deadline.title, summaries.get(deadline.caseId), deadline.notes))}`,
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

// Feed by token (PRZ-03): `null` when the link does not exist, was revoked, the user is
// inactive or the tenant suspended. Non-canceled appointments in the window + pending deadlines.
export const generateFeed = async (token: string, now: Date = new Date()): Promise<string | null> => {
  const owner = await accountService.findFeedOwner(token);
  if (!owner) return null;
  const { tenantId } = owner;
  const [appointments, deadlines] = await Promise.all([
    appointmentRepository.listInRange(tenantId, {
      from: new Date(now.getTime() - PAST_DAYS * 86_400_000),
      to: new Date(now.getTime() + FUTURE_DAYS * 86_400_000),
    }),
    deadlineService.listPendingDeadlines(tenantId),
  ]);
  const active = appointments.filter((item) => item.status !== 'canceled');
  const ids = [
    ...new Set([...active.flatMap((item) => (item.caseId ? [item.caseId] : [])), ...deadlines.map((p) => p.caseId)]),
  ];
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return buildIcs({ appointments: active, deadlines, summaries, now });
};
