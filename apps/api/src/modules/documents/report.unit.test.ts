import { pendingVariables, REPORT_VARIABLES } from '@ethica/contracts';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { CaseRecord } from '../case/case.schema.js';
import { imageDimensions, reportDocx } from './report.docx.js';
import { resolveVariables, sanitizeReportHtml } from './report.html.js';
import { DEFAULT_TEMPLATES } from './report.library.js';
import type { ReportExportData } from './report.schema.js';
import { reportHtml } from './report.templates.js';
import { reportValues } from './report.variables.js';

const legalCase = {
  id: 'p1',
  processNumber: '0007777-11.2026.5.15.0001',
  courtType: 'labor',
  role: 'court_expert',
  court: 'TRT15',
  division: '1ª Vara',
  subject: 'Insalubridade',
  parties: [
    { partyId: 'a', side: 'plaintiff', type: 'party', name: 'Ana <Silva>' },
    { partyId: 'b', side: 'defendant', type: 'party', name: 'Metalúrgica Ltda' },
    { partyId: 'c', side: 'defendant', type: 'lawyer', name: 'Dr. Réu' },
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
      sanitizeReportHtml(
        '<p style="color:red" class="x">a <strong>b</strong> <span>c</span><img src=x onerror=1></p><script>alert(1)</script><table><tbody><tr><td colspan="2" style="w">d</td></tr></tbody></table>',
      ),
    ).toBe('<p>a <strong>b</strong> c</p><table><tbody><tr><td colspan="2">d</td></tr></tbody></table>');
  });
});

describe('saneamento da foto (AD-129)', () => {
  it('mantém só a foto da vistoria, sem a origem, e remove outras imagens', () => {
    expect(
      sanitizeReportHtml(
        `<img src="http://localhost:18080${PHOTO}" alt="Prensa" onerror="x()"><img src="https://evil.com/a.png"><img src="/tenant/office/logo">`,
      ),
    ).toBe(`<img src="${PHOTO}" alt="Prensa" />`);
  });

  it('aceita a foto enviada no próprio laudo (LMO-05)', () => {
    const src = '/expert-reports/6560a0a0a0a0a0a0a0a0a0a1/media/0f8fad5b-d9cb-469f-a165-70867728950f';
    expect(sanitizeReportHtml(`<img src="https://api.example.com${src}" alt="Forno">`)).toBe(
      `<img src="${src}" alt="Forno" />`,
    );
  });
});

describe('variáveis de campo (AD-130)', () => {
  const base = {
    legalCase,
    expert: { name: 'Eng. Paula' },
    identity: { name: 'Escritório' },
    appointments: [{ type: 'inspection', status: 'done', start: new Date('2026-05-10T13:30:00Z') }] as never,
    today: '2026-10-31',
  };

  it('monta presentes, paradigmas, funções por parte, agentes e documentos do registro', () => {
    const values = reportValues({
      ...base,
      field: {
        start: new Date('2026-05-10T13:30:00Z'),
        data: {
          attendees: [
            { id: 'a', name: 'Ana', capacity: 'plaintiff' },
            { id: 'b', name: 'Dr. Réu', capacity: 'defendant_lawyer' },
          ],
          comparators: [{ id: 'p', side: 'plaintiff', name: 'João', job: 'Soldador', workedTogether: true }],
          jobs: [
            {
              id: 'f',
              title: 'Soldador',
              yearStart: 2019,
              yearEnd: 2023,
              plaintiff: { activities: 'Solda MIG', timeExposure: '8h/dia' },
              defendant: {},
            },
          ],
          agents: [
            { agent: 'noise', present: 'yes', ppe: 'protetor auricular' },
            { agent: 'cold', present: 'no' },
          ],
          documents: [
            { id: 'd', document: 'ltcat', requested: true },
            { id: 'e', document: 'ppp', requested: false },
          ],
        },
      },
    });
    expect(values).toMatchObject({
      '[HORA_VISTORIA]': '10:30',
      '[PRESENTES_VISTORIA]': 'Ana (Reclamante); Dr. Réu (advogado(a) do(a) reclamada)',
      '[PARADIGMAS_AUTOR]': 'João (Soldador, trabalhou junto)',
      '[PARADIGMAS_REU]': 'none',
      '[FUNCOES_AUTOR]': 'Soldador (2019 a 2023): Solda MIG, exposição: 8h/dia',
      '[FUNCOES_REU]': 'Soldador (2019 a 2023): sem relato',
      '[AGENTES_PRESENTES]': 'Ruído (EPI: protetor auricular)',
      '[AGENTES_AUSENTES]': 'Frio',
      '[DOCUMENTOS_SOLICITADOS]': 'LTCAT',
    });
  });

  it('sem vistoria registrada as variáveis de campo ficam pendentes', () => {
    expect(reportValues(base)['[PRESENTES_VISTORIA]']).toBeUndefined();
  });
});

describe('variáveis (AD-126)', () => {
  const values = reportValues({
    legalCase,
    expert: { name: 'Eng. Paula', professionalRegistration: 'CREA 1' },
    identity: { name: 'Escritório' },
    appointments: [
      { type: 'inspection', status: 'done', start: new Date('2026-05-10T13:00:00Z') },
      { type: 'inspection', status: 'canceled', start: new Date('2026-06-10T13:00:00Z') },
    ] as never,
    today: '2026-10-31',
  });

  it('denomina pela justiça, junta partes por polo e formata datas', () => {
    expect(values).toMatchObject({
      '[DENOMINACAO_AUTOR]': 'Reclamante',
      '[DENOMINACAO_REU]': 'Reclamada',
      '[NOME_AUTOR]': 'Ana <Silva>',
      '[ADVOGADOS_REU]': 'Dr. Réu',
      '[PERIODO_IMPRESCRITO]': '01/03/2021 a 10/02/2024',
      '[DATA_VISTORIA]': '10/05/2026',
      '[DATA_EXTENSO]': '31 de outubro de 2026',
    });
    expect(values['[VARA]']).toBe('1ª Vara');
    expect(values['[ADVOGADOS_AUTOR]']).toBe('');
    const civil = reportValues({
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
    expect(resolveVariables('<p>[NOME_AUTOR] / [ADVOGADOS_AUTOR] / [COMARCA]</p>', values, 'html')).toBe(
      '<p>Ana &lt;Silva&gt; / [ADVOGADOS_AUTOR] / [COMARCA]</p>',
    );
    expect(resolveVariables('Quesitos do(a) [DENOMINACAO_AUTOR]', values, 'text')).toBe('Quesitos do(a) Reclamante');
  });
});

describe('biblioteca padrão (LAU-05, LAU-06)', () => {
  it('toda seção com texto tem as duas variantes, HTML já saneado e só marcadores da lista', () => {
    for (const template of Object.values(DEFAULT_TEMPLATES)) {
      for (const section of template.sections) {
        if (!section.titleOnly) {
          expect(section.yesText, section.title).not.toBe('');
          expect(section.noText, section.title).not.toBe('');
        }
        expect(sanitizeReportHtml(section.yesText)).toBe(section.yesText);
        const markers = `${section.title}${section.yesText}${section.noText}`.match(/\[[A-Z_]+\]/g) ?? [];
        expect(markers.filter((m) => !(REPORT_VARIABLES as readonly string[]).includes(m))).toEqual([]);
      }
    }
  });

  it('cobre NR-15 anexos 1 a 14, NR-16, quesitos e o parecer técnico', () => {
    const titulos = DEFAULT_TEMPLATES.report.sections.map((section) => section.title);
    for (let attachment = 1; attachment <= 14; attachment += 1) {
      expect(titulos.some((title) => title.startsWith(`Anexo ${attachment} — `))).toBe(true);
    }
    expect(titulos).toEqual(
      expect.arrayContaining([
        'Dados do contrato de trabalho',
        'Documentos analisados',
        'Reconhecimento dos riscos',
        'Fundamentação legal',
        'Anexo 13-A — Benzeno',
        'Periculosidade — NR-16',
        'Conclusão',
        'Honorários periciais',
      ]),
    );
    expect(DEFAULT_TEMPLATES.technical_opinion.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        'Medições de agentes quantitativos',
        'Quesitos complementares',
        'Quesitos suplementares',
        'Impugnação do laudo pericial',
      ]),
    );
  });
});

// Minimal JPEG for the test: SOI, APP0 and SOF0 with 320×240 (the docx only embeds the bytes).
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xf0, 0x01, 0x40, 0x03, 0x01,
  0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
]);
const PHOTO = '/inspections/6560a0a0a0a0a0a0a0a0a0a0/media/0f8fad5b-d9cb-469f-a165-70867728950e';

const data = (): ReportExportData => ({
  report: {
    id: 'l1',
    caseId: 'p1',
    type: 'report',
    status: 'draft',
    title: 'Laudo pericial',
    templateName: 'Padrão',
    issues: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [
      {
        id: 's1',
        title: 'Objetivo <x>',
        level: 1,
        titleOnly: false,
        pageBreak: false,
        variant: 'yes',
        html: '<p>Texto <strong>forte</strong></p>',
      },
      {
        id: 's2',
        title: 'Insalubridade',
        level: 1,
        titleOnly: true,
        pageBreak: true,
        variant: 'yes',
        html: '',
      },
      {
        id: 's3',
        title: 'Anexo 1',
        level: 2,
        titleOnly: false,
        pageBreak: false,
        variant: 'no',
        html: `<ol><li><p>um</p></li></ol><table><tbody><tr><th>A</th></tr><tr><td>1</td></tr></tbody></table><img src="${PHOTO}" alt="Prensa"><img src="/inspections/6560a0a0a0a0a0a0a0a0a0a1/media/0f8fad5b-d9cb-469f-a165-70867728950f" alt="sumiu">`,
      },
    ],
  },
  legalCase,
  identity: { name: 'Escritório', footer: 'Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]' },
  expert: { name: 'Eng. Paula', professionalRegistration: 'CREA 1' },
  values: { '[DENOMINACAO_AUTOR]': 'Reclamante', '[NOME_AUTOR]': 'Ana', '[DATA_EXTENSO]': '31 de outubro de 2026' },
  photos: { [PHOTO]: { body: JPEG, mime: 'image/jpeg' } },
  generatedAt: new Date(),
});

describe('exportação (LAU-03.2)', () => {
  it('PDF: capa, sumário numerado, seções e quebra de página', () => {
    const { html, footerTemplate } = reportHtml(data());
    expect(html).toContain('LAUDO PERICIAL');
    expect(html).toContain('<dt>Reclamante:</dt><dd>Ana</dd>');
    expect(html).toContain('<li class="n2">2.1. Anexo 1</li>');
    expect(html).toContain('1. Objetivo &lt;x&gt;');
    expect(html).toContain('<section class="secao quebra">');
    expect(footerTemplate).toContain('pageNumber');
    expect(pendingVariables(html)).toEqual([]);
    // Inspection photo as a data URL; one that is gone leaves the document (AD-129).
    expect(html).toContain('<img src="data:image/jpeg;base64,');
    expect(html).not.toContain('/media/');
  });

  it('Word: documento válido com títulos numerados, sumário, lista e tabela', async () => {
    const files = unzipSync(new Uint8Array(await reportDocx(data())));
    const document = strFromU8(files['word/document.xml'] as Uint8Array);
    expect(document).toContain('1. Objetivo &lt;x&gt;');
    expect(document).toContain('2.1. Anexo 1');
    expect(document).toContain('TOC \\h \\o');
    expect(document).toContain('<w:tbl>');
    expect(document).toContain('forte');
    expect(Object.keys(files).filter((name) => /^word\/media\/.+\./.test(name))).toHaveLength(1);
    expect(imageDimensions(JPEG)).toEqual({ width: 320, height: 240 });
    const footer = Object.entries(files).find(([name]) => name.startsWith('word/footer'));
    expect(strFromU8(footer?.[1] as Uint8Array)).toContain('PAGE');
  });

  it('Word: foto no quadro de fotos sai com meia largura (LMO-05)', async () => {
    const base = data();
    const grid = `<table><tbody><tr><th colspan="2">Registro fotográfico</th></tr><tr><td><img src="${PHOTO}" alt="Prensa"><p>Prensa</p></td><td></td></tr></tbody></table>`;
    const sections = base.report.sections.map((section) => ({ ...section, html: section.id === 's3' ? grid : '' }));
    const document = strFromU8(
      unzipSync(new Uint8Array(await reportDocx({ ...base, report: { ...base.report, sections } })))[
        'word/document.xml'
      ] as Uint8Array,
    );
    // 320×240 px reduced to fit 283×227 px in the cell: 283 px = 2695575 EMU.
    expect(document).toContain('cx="2695575"');
    expect(document).toContain('w:gridSpan w:val="2"');
  });
});
