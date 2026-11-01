import { LAUDO_VARIAVEIS, pendingVariables } from '@ethica/contracts';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { CaseRecord } from '../case/case.schema.js';
import { MODELOS_PADRAO } from './laudo.biblioteca.js';
import { dimensoesDaImagem, laudoDocx } from './laudo.docx.js';
import { resolveVariables, sanitizeLaudoHtml } from './laudo.html.js';
import type { LaudoExportDados } from './laudo.schema.js';
import { laudoHtml } from './laudo.templates.js';
import { valoresDoLaudo } from './laudo.variaveis.js';

const legalCase = {
  id: 'p1',
  processNumber: '0007777-11.2026.5.15.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT15',
  division: '1ª Vara',
  subject: 'Insalubridade',
  parties: [
    { partyId: 'a', side: 'plaintiff', tipo: 'party', nome: 'Ana <Silva>' },
    { partyId: 'b', side: 'defendant', tipo: 'party', nome: 'Metalúrgica Ltda' },
    { partyId: 'c', side: 'defendant', tipo: 'lawyer', nome: 'Dr. Réu' },
  ],
  status: 'drafting_report',
  movements: [],
  nonPrescribedPeriodStart: '2021-03-01',
  nonPrescribedPeriodEnd: '2024-02-10',
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as CaseRecord;

describe('sanitizeLaudoHtml (AD-123)', () => {
  it('mantém só a allowlist, sem atributos além de colspan/rowspan', () => {
    expect(
      sanitizeLaudoHtml(
        '<p style="color:red" class="x">a <strong>b</strong> <span>c</span><img src=x onerror=1></p><script>alert(1)</script><table><tbody><tr><td colspan="2" style="w">d</td></tr></tbody></table>',
      ),
    ).toBe('<p>a <strong>b</strong> c</p><table><tbody><tr><td colspan="2">d</td></tr></tbody></table>');
  });
});

describe('saneamento da foto (AD-129)', () => {
  it('mantém só a foto da vistoria, sem a origem, e remove outras imagens', () => {
    expect(
      sanitizeLaudoHtml(
        `<img src="http://localhost:18080${PHOTO}" alt="Prensa" onerror="x()"><img src="https://evil.com/a.png"><img src="/tenant/office/logo">`,
      ),
    ).toBe(`<img src="${PHOTO}" alt="Prensa" />`);
  });
});

describe('variáveis de campo (AD-130)', () => {
  const base = {
    legalCase,
    expert: { name: 'Eng. Paula' },
    identity: { name: 'Escritório' },
    appointments: [{ tipo: 'inspection', status: 'done', inicio: new Date('2026-05-10T13:30:00Z') }] as never,
    today: '2026-10-31',
  };

  it('monta presentes, paradigmas, funções por parte, agentes e documentos do registro', () => {
    const valores = valoresDoLaudo({
      ...base,
      field: {
        inicio: new Date('2026-05-10T13:30:00Z'),
        dados: {
          attendees: [
            { id: 'a', nome: 'Ana', capacity: 'plaintiff' },
            { id: 'b', nome: 'Dr. Réu', capacity: 'defendant_lawyer' },
          ],
          comparators: [{ id: 'p', side: 'plaintiff', nome: 'João', job: 'Soldador', workedTogether: true }],
          jobs: [
            {
              id: 'f',
              titulo: 'Soldador',
              yearStart: 2019,
              yearEnd: 2023,
              plaintiff: { atividades: 'Solda MIG', timeExposure: '8h/dia' },
              defendant: {},
            },
          ],
          agents: [
            { agent: 'noise', present: 'yes', ppe: 'protetor auricular' },
            { agent: 'cold', present: 'no' },
          ],
          documentos: [
            { id: 'd', documento: 'ltcat', requested: true },
            { id: 'e', documento: 'ppp', requested: false },
          ],
        },
      },
    });
    expect(valores).toMatchObject({
      '[HORA_VISTORIA]': '10:30',
      '[PRESENTES_VISTORIA]': 'Ana (Reclamante); Dr. Réu (advogado(a) do(a) reclamada)',
      '[PARADIGMAS_AUTOR]': 'João (Soldador, trabalhou junto)',
      '[PARADIGMAS_REU]': 'nenhum',
      '[FUNCOES_AUTOR]': 'Soldador (2019 a 2023): Solda MIG, exposição: 8h/dia',
      '[FUNCOES_REU]': 'Soldador (2019 a 2023): sem relato',
      '[AGENTES_PRESENTES]': 'Ruído (EPI: protetor auricular)',
      '[AGENTES_AUSENTES]': 'Frio',
      '[DOCUMENTOS_SOLICITADOS]': 'LTCAT',
    });
  });

  it('sem vistoria registrada as variáveis de campo ficam pendentes', () => {
    expect(valoresDoLaudo(base)['[PRESENTES_VISTORIA]']).toBeUndefined();
  });
});

describe('variáveis (AD-126)', () => {
  const valores = valoresDoLaudo({
    legalCase,
    expert: { name: 'Eng. Paula', registroProfissional: 'CREA 1' },
    identity: { name: 'Escritório' },
    appointments: [
      { tipo: 'inspection', status: 'done', inicio: new Date('2026-05-10T13:00:00Z') },
      { tipo: 'inspection', status: 'canceled', inicio: new Date('2026-06-10T13:00:00Z') },
    ] as never,
    today: '2026-10-31',
  });

  it('denomina pela justiça, junta partes por polo e formata datas', () => {
    expect(valores).toMatchObject({
      '[DENOMINACAO_AUTOR]': 'Reclamante',
      '[DENOMINACAO_REU]': 'Reclamada',
      '[NOME_AUTOR]': 'Ana <Silva>',
      '[ADVOGADOS_REU]': 'Dr. Réu',
      '[PERIODO_IMPRESCRITO]': '01/03/2021 a 10/02/2024',
      '[DATA_VISTORIA]': '10/05/2026',
      '[DATA_EXTENSO]': '31 de outubro de 2026',
    });
    expect(valores['[VARA]']).toBe('1ª Vara');
    expect(valores['[ADVOGADOS_AUTOR]']).toBe('');
    const civil = valoresDoLaudo({
      legalCase: { ...legalCase, courtType: 'civil' },
      expert: { name: 'X' },
      identity: { name: 'E' },
      appointments: [],
      today: '2026-01-05',
    });
    expect(civil['[DENOMINACAO_AUTOR]']).toBe('Autor');
    expect(civil['[DATA_VISTORIA]']).toBeUndefined();
  });

  it('troca só o que tem valor e escapa no HTML', () => {
    expect(resolveVariables('<p>[NOME_AUTOR] / [ADVOGADOS_AUTOR] / [COMARCA]</p>', valores, 'html')).toBe(
      '<p>Ana &lt;Silva&gt; / [ADVOGADOS_AUTOR] / [COMARCA]</p>',
    );
    expect(resolveVariables('Quesitos do(a) [DENOMINACAO_AUTOR]', valores, 'texto')).toBe('Quesitos do(a) Reclamante');
  });
});

describe('biblioteca padrão (LAU-05, LAU-06)', () => {
  it('toda seção com texto tem as duas variantes, HTML já saneado e só marcadores da lista', () => {
    for (const modelo of Object.values(MODELOS_PADRAO)) {
      for (const secao of modelo.secoes) {
        if (!secao.apenasTitulo) {
          expect(secao.textoSim, secao.titulo).not.toBe('');
          expect(secao.textoNao, secao.titulo).not.toBe('');
        }
        expect(sanitizeLaudoHtml(secao.textoSim)).toBe(secao.textoSim);
        const marcadores = `${secao.titulo}${secao.textoSim}${secao.textoNao}`.match(/\[[A-Z_]+\]/g) ?? [];
        expect(marcadores.filter((m) => !(LAUDO_VARIAVEIS as readonly string[]).includes(m))).toEqual([]);
      }
    }
  });

  it('cobre NR-15 anexos 1 a 14, NR-16, quesitos e o parecer técnico', () => {
    const titulos = MODELOS_PADRAO.report.secoes.map((secao) => secao.titulo);
    for (let anexo = 1; anexo <= 14; anexo += 1) {
      expect(titulos.some((titulo) => titulo.startsWith(`Anexo ${anexo} — `))).toBe(true);
    }
    expect(titulos).toEqual(expect.arrayContaining(['Periculosidade — NR-16', 'Conclusão', 'Honorários periciais']));
    expect(MODELOS_PADRAO.technical_opinion.secoes.map((secao) => secao.titulo)).toEqual(
      expect.arrayContaining([
        'Medições de agentes quantitativos',
        'Quesitos complementares',
        'Quesitos suplementares',
        'Impugnação do laudo pericial',
      ]),
    );
  });
});

// JPEG mínimo para o teste: SOI, APP0 e SOF0 com 320×240 (o docx só embute os bytes).
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xf0, 0x01, 0x40, 0x03, 0x01,
  0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
]);
const PHOTO = '/inspections/6560a0a0a0a0a0a0a0a0a0a0/media/0f8fad5b-d9cb-469f-a165-70867728950e';

const dados = (): LaudoExportDados => ({
  laudo: {
    id: 'l1',
    caseId: 'p1',
    tipo: 'report',
    status: 'draft',
    titulo: 'Laudo pericial',
    modeloNome: 'Padrão',
    pendencias: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    secoes: [
      {
        id: 's1',
        titulo: 'Objetivo <x>',
        nivel: 1,
        apenasTitulo: false,
        quebraPagina: false,
        variante: 'yes',
        html: '<p>Texto <strong>forte</strong></p>',
      },
      {
        id: 's2',
        titulo: 'Insalubridade',
        nivel: 1,
        apenasTitulo: true,
        quebraPagina: true,
        variante: 'yes',
        html: '',
      },
      {
        id: 's3',
        titulo: 'Anexo 1',
        nivel: 2,
        apenasTitulo: false,
        quebraPagina: false,
        variante: 'no',
        html: `<ol><li><p>um</p></li></ol><table><tbody><tr><th>A</th></tr><tr><td>1</td></tr></tbody></table><img src="${PHOTO}" alt="Prensa"><img src="/inspections/6560a0a0a0a0a0a0a0a0a0a1/media/0f8fad5b-d9cb-469f-a165-70867728950f" alt="sumiu">`,
      },
    ],
  },
  legalCase,
  identity: { name: 'Escritório', rodape: 'Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]' },
  expert: { name: 'Eng. Paula', registroProfissional: 'CREA 1' },
  valores: { '[DENOMINACAO_AUTOR]': 'Reclamante', '[NOME_AUTOR]': 'Ana', '[DATA_EXTENSO]': '31 de outubro de 2026' },
  photos: { [PHOTO]: { body: JPEG, mime: 'image/jpeg' } },
  geradoEm: new Date(),
});

describe('exportação (LAU-03.2)', () => {
  it('PDF: capa, sumário numerado, seções e quebra de página', () => {
    const { html, footerTemplate } = laudoHtml(dados());
    expect(html).toContain('LAUDO PERICIAL');
    expect(html).toContain('<dt>Reclamante:</dt><dd>Ana</dd>');
    expect(html).toContain('<li class="n2">2.1. Anexo 1</li>');
    expect(html).toContain('1. Objetivo &lt;x&gt;');
    expect(html).toContain('<section class="secao quebra">');
    expect(footerTemplate).toContain('pageNumber');
    expect(pendingVariables(html)).toEqual([]);
    // Foto da vistoria em data URL; a que sumiu sai do documento (AD-129).
    expect(html).toContain('<img src="data:image/jpeg;base64,');
    expect(html).not.toContain('/media/');
  });

  it('Word: documento válido com títulos numerados, sumário, lista e tabela', async () => {
    const arquivos = unzipSync(new Uint8Array(await laudoDocx(dados())));
    const documento = strFromU8(arquivos['word/document.xml'] as Uint8Array);
    expect(documento).toContain('1. Objetivo &lt;x&gt;');
    expect(documento).toContain('2.1. Anexo 1');
    expect(documento).toContain('TOC \\h \\o');
    expect(documento).toContain('<w:tbl>');
    expect(documento).toContain('forte');
    expect(Object.keys(arquivos).filter((nome) => /^word\/media\/.+\./.test(nome))).toHaveLength(1);
    expect(dimensoesDaImagem(JPEG)).toEqual({ width: 320, height: 240 });
    const rodape = Object.entries(arquivos).find(([nome]) => nome.startsWith('word/footer'));
    expect(strFromU8(rodape?.[1] as Uint8Array)).toContain('PAGE');
  });
});
