import { suggestCsvField } from '@ethica/contracts';
import { describe, expect, it } from 'vitest';
import { courtUnitFromNumber, extractMinutes, parseCsv, parseData, rowToCase } from './import.service.js';

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
  it('lê CREA, e-mail e telefone ao lado do nome, uma vez cada (PSV-06)', () => {
    const text = MINUTES.replace(
      'ADVOGADO: ANA SOUZA - OAB 654321/SP',
      'ADVOGADO: ANA SOUZA - OAB 654321/SP - ana@adv.com.br - (11) 98765-4321\nRECLAMADO: CARLOS LIMA - CREA/SC 184822-0',
    );
    const { draft } = extractMinutes(`${text}\n${text}`);
    expect(draft.parties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'lawyer',
          name: 'ANA SOUZA',
          oab: 'SP654321',
          email: 'ana@adv.com.br',
          phone: '(11) 98765-4321',
        }),
        expect.objectContaining({ type: 'party', name: 'CARLOS LIMA', crea: 'SC1848220' }),
      ]),
    );
    expect(draft.parties?.filter((party) => party.name === 'ANA SOUZA')).toHaveLength(1);
  });

  it('extrai número, órgão, vara, comarca, objeto, partes e nomeação; o prazo do laudo fica para a perita (RSV-02)', () => {
    const { draft, missing, warnings } = extractMinutes(MINUTES);
    expect(draft).toMatchObject({
      processNumber: '0001234-56.2026.5.02.0001',
      courtType: 'labor',
      court: 'TRT2',
      role: 'court_expert',
      division: '1ª Vara do Trabalho',
      district: 'São Paulo',
      subject: 'Apuração de insalubridade',
      nominationDate: '2026-10-15',
    });
    expect(draft).not.toHaveProperty('reportDeadline');
    expect(draft.parties).toEqual([
      { side: 'plaintiff', type: 'party', name: 'MARIA DA SILVA', document: '12345678909' },
      { side: 'plaintiff', type: 'lawyer', name: 'JOÃO PEREIRA', oab: 'SP123456' },
      { side: 'defendant', type: 'party', name: 'INDÚSTRIA EXEMPLO LTDA', document: '12345678000195' },
      { side: 'defendant', type: 'lawyer', name: 'ANA SOUZA', oab: 'SP654321' },
    ]);
    expect(missing).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('partes do último despacho do processo e data da última nomeação (RSV-02)', () => {
    const latest = `RECLAMANTE: Maria da Silva
ADVOGADO: JOÃO PEREIRA - OAB SP123.456
RECLAMADO: INDÚSTRIA EXEMPLO LTDA
RECLAMADO: NOVA EMPRESA S.A.
DESPACHO
Destituo o perito anterior e nomeio o engenheiro Paulo Reis em 03/02/2027.`;
    const { draft } = extractMinutes(`${MINUTES}\n${latest}`);
    expect(draft.nominationDate).toBe('2027-02-03');
    expect(draft.parties).toEqual([
      { side: 'plaintiff', type: 'party', name: 'Maria da Silva' },
      { side: 'plaintiff', type: 'lawyer', name: 'JOÃO PEREIRA', oab: 'SP123456' },
      { side: 'defendant', type: 'party', name: 'INDÚSTRIA EXEMPLO LTDA' },
      { side: 'defendant', type: 'party', name: 'NOVA EMPRESA S.A.' },
    ]);
  });

  it('cabeçalho repetido em cada página do processo completo não repete as partes', () => {
    const { draft } = extractMinutes(`${MINUTES}\n${MINUTES}\n${MINUTES}`);
    expect(draft.parties).toHaveLength(4);
  });

  it.each([
    ['Órgão Julgador: Juízo da 1ª Vara Cível da Comarca de Sapiranga', '1ª Vara Cível', 'Sapiranga'],
    ['Juízo de Direito da 3º Vara Civel - Foro Central', '3ª Vara Civel', undefined],
    ['2ª Vara do Trabalho de Novo Hamburgo', '2ª Vara do Trabalho', 'Novo Hamburgo'],
    ['Juízo Substituto da 5 Vara Federal de Porto Alegre', '5ª Vara Federal', 'Porto Alegre'],
    ['Vara de Família da Comarca de Canoas', 'Vara de Família', 'Canoas'],
  ])('a vara fica só com a classificação: %s', (row, division, district) => {
    const { draft } = extractMinutes(MINUTES.replace('1ª Vara do Trabalho de São Paulo', row));
    expect(draft.division).toBe(division);
    if (district) expect(draft.district).toBe(district);
  });

  it('a vara é a do Órgão Julgador, mesmo com outra vara citada antes', () => {
    const text = MINUTES.replace(
      '1ª Vara do Trabalho de São Paulo',
      'Redistribuído da 3ª Vara Cível de Canoas\nÓrgão Julgador: Juízo da 1ª Vara Cível da Comarca de Sapiranga',
    );
    expect(extractMinutes(text).draft.division).toBe('1ª Vara Cível');
  });

  it('o objeto é o que o juiz pediu na perícia, do último despacho', () => {
    const text = `${MINUTES}\nDetermino a realização de perícia técnica de engenharia para verificar a existência de
vícios construtivos no imóvel dos autores; intimem-se.`;
    expect(extractMinutes(text).draft.subject).toBe(
      'Verificar a existência de vícios construtivos no imóvel dos autores',
    );
  });

  it('campo não achado fica vazio e entra em "missing"; vários números geram aviso (IMP-01.2)', () => {
    const { draft, missing, warnings } = extractMinutes(
      'Processos 0001234-56.2026.5.02.0001 e 0009999-11.2025.5.02.0002 em pauta.',
    );
    expect(draft.processNumber).toBe('0001234-56.2026.5.02.0001');
    expect(draft).not.toHaveProperty('subject');
    expect(missing).toEqual(['division', 'district', 'subject', 'parties', 'nominationDate']);
    expect(warnings).toContain('multiple_process_numbers');
  });

  it('prazo escrito no despacho não preenche o prazo do laudo; número sem pontuação é sinalizado inválido', () => {
    const { draft, warnings } = extractMinutes(
      'Processo 00012345620265020001. Objeto: Perícia médica\nO laudo deverá ser entregue até 30/11/2026.',
    );
    expect(draft.subject).toBe('Perícia médica');
    expect(draft).not.toHaveProperty('reportDeadline');
    expect(warnings).toEqual(['invalid_process_number']);
  });
});

describe('orgaoDoNumero e parseData', () => {
  it('segmento e tribunal do número CNJ (AD-118)', () => {
    expect(courtUnitFromNumber('0001234-56.2026.5.15.0001')).toEqual({ courtType: 'labor', court: 'TRT15' });
    expect(courtUnitFromNumber('0001234-56.2026.4.03.6100')).toEqual({ courtType: 'federal', court: 'TRF3' });
    expect(courtUnitFromNumber('0001234-56.2026.8.26.0100')).toEqual({ courtType: 'civil', court: 'TJSP' });
    expect(courtUnitFromNumber('0001234-56.2026.6.26.0100')).toBeUndefined();
  });

  it('aceita DD/MM/AAAA e AAAA-MM-DD; recusa data impossível', () => {
    expect(parseData('5/3/2026')).toBe('2026-03-05');
    expect(parseData('2026-03-05')).toBe('2026-03-05');
    expect(parseData('31/02/2026')).toBeUndefined();
    expect(parseData('2026/03/05')).toBeUndefined();
  });
});

describe('planilha de qualquer modelo (AD-115, RSV-04)', () => {
  it('separa por ";", "," ou tabulação, respeita aspas e ignora o BOM', () => {
    expect(parseCsv('﻿a;b\r\n"x;y";"diz ""oi"""\n')).toEqual([
      ['a', 'b'],
      ['x;y', 'diz "oi"'],
    ]);
    expect(parseCsv('a,b\n"1,5",2')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
  });

  it('sugere o campo pelo nome da coluna; o que não reconhece vai para Observações com dúvida', () => {
    expect(suggestCsvField('Nº do Processo')).toEqual({ field: 'processNumber', certain: true });
    expect(suggestCsvField('Reclamante')).toEqual({ field: 'plaintiff', certain: true });
    expect(suggestCsvField('CPF do Reclamante')).toEqual({ field: 'plaintiffDocument', certain: true });
    expect(suggestCsvField('Valor dos honorários (R$)')).toEqual({ field: 'proposedFees', certain: false });
    expect(suggestCsvField('Perito assistente da parte')).toEqual({ field: 'notes', certain: false });
  });

  const cells = (values: Record<string, string>) =>
    Object.entries(values).map(([header, value]) => ({ header, value, field: suggestCsvField(header).field }));

  it('linha vira cadastro com tipo, órgão pelo número, fase, datas, dinheiro, partes e observações', () => {
    const result = rowToCase(
      cells({
        'Tipo de serviço': 'Perícia trabalhista',
        Processo: '00012345620265020001',
        Objeto: 'Insalubridade',
        Situação: 'Laudo entregue',
        'Data da nomeação': '15-10-2026',
        Prazo: '31/02/2026',
        Honorários: 'R$ 3.500,50',
        Reclamante: 'Maria',
        'Advogado do reclamante': 'João',
        'OAB do reclamante': 'OAB/SP 123456',
        Reclamada: 'Indústria',
        'CNPJ da reclamada': '12.345.678/0001-95',
        'Perito assistente': 'Carlos',
      }),
    );
    expect(result).toEqual({
      data: expect.objectContaining({
        processNumber: '0001234-56.2026.5.02.0001',
        courtType: 'labor',
        court: 'TRT2',
        role: 'court_expert',
        phase: 'report_delivered',
        nominationDate: '2026-10-15',
        proposedFeesCents: 350_050,
        parties: [
          { side: 'plaintiff', type: 'party', name: 'Maria' },
          { side: 'plaintiff', type: 'lawyer', name: 'João', oab: 'SP123456' },
          { side: 'defendant', type: 'party', name: 'Indústria', document: '12345678000195' },
        ],
        notes: 'Prazo: 31/02/2026 (!)\nPerito assistente: Carlos',
      }),
    });
    expect(result).not.toHaveProperty('data.reportDeadline');
  });

  it('assistência técnica não tem esfera nem exige processo (AD-178)', () => {
    const result = rowToCase(cells({ 'Tipo de serviço': 'Assistência técnica', Objeto: 'x', Situação: 'Suspenso' }));
    expect(result).toEqual({ data: expect.objectContaining({ role: 'technical_assistant', status: 'suspended' }) });
    expect(result).not.toHaveProperty('data.courtType');
  });

  it('assistência técnica lê a fase da sua lista; fase da perícia fica em branco com "(!)" (AD-186)', () => {
    expect(
      rowToCase(cells({ 'Tipo de serviço': 'Assistência técnica', Objeto: 'x', Situação: 'Parecer entregue' })),
    ).toEqual({
      data: expect.objectContaining({ phase: 'technical_opinion_delivered' }),
    });
    const result = rowToCase(
      cells({ 'Tipo de serviço': 'Assistência técnica', Objeto: 'x', Situação: 'Laudo entregue' }),
    );
    expect(result).toEqual({ data: expect.objectContaining({ notes: 'Situação: Laudo entregue (!)' }) });
    expect(result).not.toHaveProperty('data.phase');
  });

  it('tipo do escritório sem processo usa o tipo como objeto', () => {
    expect(rowToCase(cells({ 'Tipo de serviço': 'Avaliação de imóvel', Status: 'xyz' }))).toEqual({
      data: expect.objectContaining({
        serviceType: 'Avaliação de imóvel',
        subject: 'Avaliação de imóvel',
        notes: 'Status: xyz (!)',
      }),
    });
  });

  it.each([
    [{ Objeto: 'x' }, { reason: 'csv_missing_process_number' }],
    [
      { Processo: '123', Objeto: 'x' },
      { column: 'Processo', reason: 'invalid_process_number' },
    ],
    [
      { Processo: '0001234-56.2026.6.26.0100', Objeto: 'x' },
      { column: 'Processo', reason: 'unsupported_court' },
    ],
    [{ Processo: '0001234-56.2026.5.02.0001' }, { reason: 'csv_missing_subject' }],
  ])('recusa a linha com o motivo (%j)', (values, reason) => {
    expect(rowToCase(cells(values))).toEqual(reason);
  });
});
