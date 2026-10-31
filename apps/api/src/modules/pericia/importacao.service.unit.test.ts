import type { CsvImportColumn } from '@ethica/contracts';
import { describe, expect, it } from 'vitest';
import { extrairAta, linhaParaPericia, orgaoDoNumero, parseCsv, parseData } from './importacao.service.js';

const ATA = `PODER JUDICIÁRIO
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
    const { draft, missing, warnings } = extrairAta(ATA);
    expect(draft).toMatchObject({
      numeroProcesso: '0001234-56.2026.5.02.0001',
      justica: 'labor',
      tribunal: 'TRT2',
      papel: 'court_expert',
      vara: '1ª Vara do Trabalho',
      comarca: 'São Paulo',
      objeto: 'Perícia de insalubridade',
      dataNomeacao: '2026-10-15',
      prazoLaudo: '2026-11-14',
    });
    expect(draft.partes).toEqual([
      { polo: 'plaintiff', tipo: 'party', nome: 'MARIA DA SILVA', documento: '12345678909' },
      { polo: 'plaintiff', tipo: 'lawyer', nome: 'JOÃO PEREIRA', oab: 'SP123456' },
      { polo: 'defendant', tipo: 'party', nome: 'INDÚSTRIA EXEMPLO LTDA', documento: '12345678000195' },
      { polo: 'defendant', tipo: 'lawyer', nome: 'ANA SOUZA', oab: 'SP654321' },
    ]);
    expect(missing).toEqual([]);
    expect(warnings).toEqual(['deadline_calculated']);
  });

  it('campo não achado fica vazio e entra em "missing"; vários números geram aviso (IMP-01.2)', () => {
    const { draft, missing, warnings } = extrairAta(
      'Processos 0001234-56.2026.5.02.0001 e 0009999-11.2025.5.02.0002 em pauta.',
    );
    expect(draft.numeroProcesso).toBe('0001234-56.2026.5.02.0001');
    expect(draft).not.toHaveProperty('objeto');
    expect(missing).toEqual(['vara', 'comarca', 'objeto', 'partes', 'dataNomeacao', 'prazoLaudo']);
    expect(warnings).toContain('multiple_process_numbers');
  });

  it('prazo com data explícita não é calculado; número sem pontuação é sinalizado inválido', () => {
    const { draft, warnings } = extrairAta(
      'Processo 00012345620265020001. Objeto: Perícia médica\nO laudo deverá ser entregue até 30/11/2026.',
    );
    expect(draft.objeto).toBe('Perícia médica');
    expect(draft.prazoLaudo).toBe('2026-11-30');
    expect(warnings).toEqual(['invalid_process_number']);
  });
});

describe('orgaoDoNumero e parseData', () => {
  it('segmento e tribunal do número CNJ (AD-118)', () => {
    expect(orgaoDoNumero('0001234-56.2026.5.15.0001')).toEqual({ justica: 'labor', tribunal: 'TRT15' });
    expect(orgaoDoNumero('0001234-56.2026.4.03.6100')).toEqual({ justica: 'federal', tribunal: 'TRF3' });
    expect(orgaoDoNumero('0001234-56.2026.8.26.0100')).toEqual({ justica: 'civil', tribunal: 'TJSP' });
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
    const result = linhaParaPericia(
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
        numeroProcesso: '0001234-56.2026.5.02.0001',
        justica: 'labor',
        tribunal: 'TRT2',
        papel: 'technical_assistant',
        dataNomeacao: '2026-10-15',
        honorariosPropostosCents: 350_050,
        partes: [
          { polo: 'plaintiff', tipo: 'party', nome: 'Maria' },
          { polo: 'plaintiff', tipo: 'lawyer', nome: 'João', oab: 'SP123456' },
          { polo: 'defendant', tipo: 'party', nome: 'Indústria', documento: '12345678000195' },
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
  ])('recusa a linha com o motivo (%j)', (valores, motivo) => {
    expect(linhaParaPericia(linha(valores as Partial<Record<CsvImportColumn, string>>))).toEqual(motivo);
  });
});
