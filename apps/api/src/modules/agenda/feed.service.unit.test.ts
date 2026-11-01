import { describe, expect, it, vi } from 'vitest';
import type { DeadlineRecord } from '../case/deadline.schema.js';
import * as accountService from '../identity/account.service.js';
import type { CompromissoRecord } from './compromisso.schema.js';
import { gerarFeed, montarIcs } from './feed.service.js';

vi.mock('../identity/account.service.js', () => ({ findFeedOwner: vi.fn() }));
vi.mock('../case/case.service.js', () => ({ findResumosByIds: vi.fn() }));
vi.mock('../case/deadline.service.js', () => ({ listPendingDeadlines: vi.fn() }));
vi.mock('./compromisso.repository.js', () => ({ listInRange: vi.fn() }));

const now = new Date('2026-11-01T10:00:00.000Z');
const vistoria: CompromissoRecord = {
  id: 'c1',
  tipo: 'inspection',
  titulo: 'Vistoria na fábrica',
  inicio: new Date('2026-11-10T12:00:00.000Z'),
  fim: new Date('2026-11-10T13:30:00.000Z'),
  local: 'Av. Industrial, 1500; galpão 2',
  caseId: 'p1',
  status: 'scheduled',
  origem: 'manual',
  observacoes: 'Levar decibelímetro',
  avisos: [],
  createdAt: now,
  updatedAt: now,
};
const deadline: DeadlineRecord = {
  id: 'z1',
  caseId: 'p1',
  titulo: 'Entrega do laudo',
  vencimento: '2026-11-30',
  status: 'pending',
  createdAt: now,
  updatedAt: now,
};
const resumos = new Map([
  [
    'p1',
    { processNumber: '0001234-56.2026.5.02.0001', plaintiff: 'Maria da Silva', defendant: 'Indústria Exemplo Ltda.' },
  ],
]);

const unfold = (ics: string) => ics.replace(/\r\n /g, '');
const eventOf = (ics: string, uid: string) => {
  const block =
    unfold(ics)
      .split('BEGIN:VEVENT')
      .find((part) => part.includes(`UID:${uid}`)) ?? '';
  return block.split('END:VEVENT')[0] as string;
};

// PRZ-03.3: cada evento leva data, descrição (tipo, título, nº do processo, partes,
// observações) e local (endereço do compromisso; vazio no prazo).
describe('montarIcs', () => {
  const ics = montarIcs({ compromissos: [vistoria], deadlines: [deadline], resumos, now });

  it('é um VCALENDAR com linhas CRLF de no máximo 75 octetos', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });

  it('compromisso: início e fim em UTC, local escapado e descrição completa', () => {
    const event = eventOf(ics, 'compromisso-c1@ethica');
    expect(event).toContain('DTSTART:20261110T120000Z');
    expect(event).toContain('DTEND:20261110T133000Z');
    expect(event).toContain('SUMMARY:Vistoria na fábrica');
    expect(event).toContain('LOCATION:Av. Industrial\\, 1500\\; galpão 2');
    expect(event).toContain(
      'DESCRIPTION:Tipo: Vistoria\\nTítulo: Vistoria na fábrica\\nProcesso: 0001234-56.2026.5.02.0001\\nPartes: Maria da Silva × Indústria Exemplo Ltda.\\nObservações: Levar decibelímetro',
    );
  });

  it('prazo: evento de dia inteiro (fim exclusivo no dia seguinte) e sem local', () => {
    const event = eventOf(ics, 'prazo-z1@ethica');
    expect(event).toContain('DTSTART;VALUE=DATE:20261130');
    expect(event).toContain('DTEND;VALUE=DATE:20261201');
    expect(event).toContain('SUMMARY:Prazo: Entrega do laudo');
    expect(event).toContain('DESCRIPTION:Tipo: Prazo\\nTítulo: Entrega do laudo\\nProcesso: 0001234-56.2026.5.02.0001');
    expect(event).not.toContain('LOCATION');
  });
});

describe('gerarFeed', () => {
  it('link inexistente, revogado ou de tenant suspenso (sem dono) devolve null', async () => {
    vi.mocked(accountService.findFeedOwner).mockResolvedValue(null);
    await expect(gerarFeed('a'.repeat(64), now)).resolves.toBeNull();
  });
});
