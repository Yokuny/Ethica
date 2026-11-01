import type { CsvImportColumn } from '@ethica/contracts';
import { describe, expect, it } from 'vitest';
import { extractMinutes, orgaoDoNumero, parseCsv, parseData, rowToCase } from './import.service.js';

const MINUTES = `PODER JUDICIÁRIO
JUSTIÇA DO TRABALHO
TRIBUNAL REGIONAL DO TRABALHO DA 2ª REGIÃO
1ª Vara do Trabalho de São Paulo
ATOrd 0001234-56.2026.5.02.0001
RECLAMANTE: MARIA DA SILVA - CPF: 123.456.789-09
ADVOGADO: JOÃO PEREIRA - OAB SP123.456
RECLAMADO: INDÚSTRIA EXEMPLO LTDA - CNPJ: 12.345.678/0001-95
ADVOGADO: ANA SOUZA - OAB 654321/SP
DESPACHO
Defiro a prova pericial para apuração de insalubridade. Nomeio como perito o engenheiro
Carlos Lima em 15/10/2026. O perito deverá entregar o laudo no prazo de 30 dias.
São Paulo, 15 de outubro de 2026.`;

describe('extrairAta (AD-114)', () => {
  it('extrai número, órgão, vara, comarca, objeto, partes, nomeação e prazo calculado', () => {
    const { draft, missing, warnings } = extractMinutes(MINUTES);
    expect(draft).toMatchObject({
      processNumber: '0001234-56.2026.5.02.0001',
      courtType: 'labor',
      court: 'TRT2',
      role: 'court_expert',
      division: '1ª Vara do Trabalho',
      district: 'São Paulo',
      subject: 'Perícia de insalubridade',
      nominationDate: '2026-10-15',
      reportDeadline: '2026-11-14',
    });
    expect(draft.parties).toEqual([
      { side: 'plaintiff', tipo: 'party', nome: 'MARIA DA SILVA', documento: '12345678909' },
      { side: 'plaintiff', tipo: 'lawyer', nome: 'JOÃO PEREIRA', oab: 'SP123456' },
      { side: 'defendant', tipo: 'party', nome: 'INDÚSTRIA EXEMPLO LTDA', documento: '12345678000195' },
      { side: 'defendant', tipo: 'lawyer', nome: 'ANA SOUZA', oab: 'SP654321' },
    ]);
    expect(missing).toEqual([]);
    expect(warnings).toEqual(['deadline_calculated']);
  });

  it('campo não achado fica vazio e entra em "missing"; vários números geram aviso (IMP-01.2)', () => {
    const { draft, missing, warnings } = extractMinutes(
      'Processos 0001234-56.2026.5.02.0001 e 0009999-11.2025.5.02.0002 em pauta.',
    );
    expect(draft.processNumber).toBe('0001234-56.2026.5.02.0001');
    expect(draft).not.toHaveProperty('subject');
    expect(missing).toEqual(['division', 'district', 'subject', 'parties', 'nominationDate', 'reportDeadline']);
    expect(warnings).toContain('multiple_process_numbers');
  });

  it('prazo com data explícita não é calculado; número sem pontuação é sinalizado inválido', () => {
    const { draft, warnings } = extractMinutes(
      'Processo 00012345620265020001. Objeto: Perícia médica\nO laudo deverá ser entregue até 30/11/2026.',
    );
    expect(draft.subject).toBe('Perícia médica');
    expect(draft.reportDeadline).toBe('2026-11-30');
    expect(warnings).toEqual(['invalid_process_number']);
  });
});

describe('orgaoDoNumero e parseData', () => {
  it('segmento e tribunal do número CNJ (AD-118)', () => {
    expect(orgaoDoNumero('0001234-56.2026.5.15.0001')).toEqual({ courtType: 'labor', court: 'TRT15' });
    expect(orgaoDoNumero('0001234-56.2026.4.03.6100')).toEqual({ courtType: 'federal', court: 'TRF3' });
    expect(orgaoDoNumero('0001234-56.2026.8.26.0100')).toEqual({ courtType: 'civil', court: 'TJSP' });
    expect(orgaoDoNumero('0001234-56.2026.6.26.0100')).toBeUndefined();
  });

  it('aceita DD/MM/AAAA e AAAA-MM-DD; recusa data impossível', () => {
    expect(parseData('5/3/2026')).toBe('2026-03-05');
    expect(parseData('2026-03-05')).toBe('2026-03-05');
    expect(parseData('31/02/2026')).toBeUndefined();
    expect(parseData('2026/03/05')).toBeUndefined();
  });
});

describe('parseCsv e linhaParaPericia (AD-115)', () => {
  it('separa por ";", respeita aspas e ignora o BOM', () => {
    expect(parseCsv('﻿a;b\r\n"x;y";"diz ""oi"""\n')).toEqual([
      ['a', 'b'],
      ['x;y', 'diz "oi"'],
    ]);
  });

  const linha = (valores: Partial<Record<CsvImportColumn, string>>) => (coluna: CsvImportColumn) =>
    valores[coluna] ?? '';

  it('linha válida vira cadastro com órgão pelo número, datas, dinheiro e partes', () => {
    const result = rowToCase(
      linha({
        numero_processo: '0001234-56.2026.5.02.0001',
        objeto: 'Insalubridade',
        papel: 'Assistente',
        data_nomeacao: '15/10/2026',
        honorarios_propostos: 'R$ 3.500,50',
        autor: 'Maria',
        autor_advogado: 'João',
        autor_advogado_oab: 'OAB/SP 123456',
        reu: 'Indústria',
        reu_documento: '12.345.678/0001-95',
      }),
    );
    expect(result).toEqual({
      data: expect.objectContaining({
        processNumber: '0001234-56.2026.5.02.0001',
        courtType: 'labor',
        court: 'TRT2',
        role: 'technical_assistant',
        nominationDate: '2026-10-15',
        proposedFeesCents: 350_050,
        parties: [
          { side: 'plaintiff', tipo: 'party', nome: 'Maria' },
          { side: 'plaintiff', tipo: 'lawyer', nome: 'João', oab: 'SP123456' },
          { side: 'defendant', tipo: 'party', nome: 'Indústria', documento: '12345678000195' },
        ],
      }),
    });
  });

  it.each([
    [{ objeto: 'x' }, { column: 'numero_processo', reason: 'missing_required_field' }],
    [
      { numero_processo: '123', objeto: 'x' },
      { column: 'numero_processo', reason: 'invalid_process_number' },
    ],
    [
      { numero_processo: '0001234-56.2026.6.26.0100', objeto: 'x' },
      { column: 'numero_processo', reason: 'unsupported_court' },
    ],
    [
      { numero_processo: '0001234-56.2026.5.02.0001', objeto: 'x', data_admissao: '31/02/2020' },
      { column: 'data_admissao', reason: 'invalid_date' },
    ],
    [
      { numero_processo: '0001234-56.2026.5.02.0001', objeto: 'x', reu_documento: '123' },
      { column: 'reu_documento', reason: 'invalid_field' },
    ],
    [
      { numero_processo: '0001234-56.2026.5.02.0001', objeto: 'x'.repeat(600) },
      { column: 'objeto', reason: 'invalid_field' },
    ],
  ])('recusa a linha com o motivo (%j)', (valores, reason) => {
    expect(rowToCase(linha(valores as Partial<Record<CsvImportColumn, string>>))).toEqual(reason);
  });
});
