import { describe, expect, it } from 'vitest';
import { courtMovementRows } from './court-movement-rows.js';

const movement = (key: string, code: number, at: string, name = `M${code}`, complement?: string) => ({
  key,
  code,
  name,
  at,
  complements: complement ? [{ code: 4, name: complement, value: complement === 'Alvará' ? 73 : 1 }] : [],
});

describe('lista No tribunal sem ruído (SGD-08)', () => {
  it('tira o decurso, junta publicação e disponibilização e agrupa o mesmo documento do dia', () => {
    const rows = courtMovementRows([
      movement('d', 1051, '2026-10-23T00:02:00Z'),
      movement('p', 92, '2026-10-26T02:35:00Z', 'Publicação'),
      movement('v', 1061, '2026-10-26T02:35:00Z', 'Disponibilização no Diário da Justiça Eletrônico'),
      movement('a1', 60, '2022-02-21T10:00:00Z', 'Expedição de documento', 'Alvará'),
      movement('a2', 60, '2022-02-21T11:00:00Z', 'Expedição de documento', 'Alvará'),
      movement('o', 60, '2022-02-21T12:00:00Z', 'Expedição de documento', 'Outros documentos'),
      movement('s', 272, '2022-01-01T10:00:00Z', 'Suspensão'),
    ]);
    expect(rows.map((row) => [row.key, row.count, row.rule])).toEqual([
      ['p', 1, false],
      ['a1', 2, true],
      ['o', 1, false],
      ['s', 1, true],
    ]);
  });
});
