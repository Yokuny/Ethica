import { LAUDO_VARIAVEIS, variaveisPendentes } from '@ethica/contracts';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { PericiaRecord } from '../pericia/pericia.schema.js';
import { MODELOS_PADRAO } from './laudo.biblioteca.js';
import { laudoDocx } from './laudo.docx.js';
import { resolverVariaveis, sanitizeLaudoHtml } from './laudo.html.js';
import type { LaudoExportDados } from './laudo.schema.js';
import { laudoHtml } from './laudo.templates.js';
import { valoresDoLaudo } from './laudo.variaveis.js';

const pericia = {
  id: 'p1',
  numeroProcesso: '0007777-11.2026.5.15.0001',
  justica: 'labor',
  papel: 'court_expert',
  tribunal: 'TRT15',
  vara: '1ª Vara',
  objeto: 'Insalubridade',
  partes: [
    { parteId: 'a', polo: 'plaintiff', tipo: 'party', nome: 'Ana <Silva>' },
    { parteId: 'b', polo: 'defendant', tipo: 'party', nome: 'Metalúrgica Ltda' },
    { parteId: 'c', polo: 'defendant', tipo: 'lawyer', nome: 'Dr. Réu' },
  ],
  status: 'drafting_report',
  movimentacoes: [],
  periodoImprescritoInicio: '2021-03-01',
  periodoImprescritoFim: '2024-02-10',
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as PericiaRecord;

describe('sanitizeLaudoHtml (AD-123)', () => {
  it('mantém só a allowlist, sem atributos além de colspan/rowspan', () => {
    expect(
      sanitizeLaudoHtml(
        '<p style="color:red" class="x">a <strong>b</strong> <span>c</span><img src=x onerror=1></p><script>alert(1)</script><table><tbody><tr><td colspan="2" style="w">d</td></tr></tbody></table>',
      ),
    ).toBe('<p>a <strong>b</strong> c</p><table><tbody><tr><td colspan="2">d</td></tr></tbody></table>');
  });
});

describe('variáveis (AD-126)', () => {
  const valores = valoresDoLaudo({
    pericia,
    perito: { name: 'Eng. Paula', registroProfissional: 'CREA 1' },
    identity: { name: 'Escritório' },
    compromissos: [
      { tipo: 'inspection', status: 'done', inicio: new Date('2026-05-10T13:00:00Z') },
      { tipo: 'inspection', status: 'canceled', inicio: new Date('2026-06-10T13:00:00Z') },
    ] as never,
    hoje: '2026-10-31',
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
      pericia: { ...pericia, justica: 'civil' },
      perito: { name: 'X' },
      identity: { name: 'E' },
      compromissos: [],
      hoje: '2026-01-05',
    });
    expect(civil['[DENOMINACAO_AUTOR]']).toBe('Autor');
    expect(civil['[DATA_VISTORIA]']).toBeUndefined();
  });

  it('troca só o que tem valor e escapa no HTML', () => {
    expect(resolverVariaveis('<p>[NOME_AUTOR] / [ADVOGADOS_AUTOR] / [COMARCA]</p>', valores, 'html')).toBe(
      '<p>Ana &lt;Silva&gt; / [ADVOGADOS_AUTOR] / [COMARCA]</p>',
    );
    expect(resolverVariaveis('Quesitos do(a) [DENOMINACAO_AUTOR]', valores, 'texto')).toBe('Quesitos do(a) Reclamante');
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

const dados = (): LaudoExportDados => ({
  laudo: {
    id: 'l1',
    periciaId: 'p1',
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
        html: '<ol><li><p>um</p></li></ol><table><tbody><tr><th>A</th></tr><tr><td>1</td></tr></tbody></table>',
      },
    ],
  },
  pericia,
  identity: { name: 'Escritório', rodape: 'Página [PAGINA_ATUAL] de [TOTAL_PAGINAS]' },
  perito: { name: 'Eng. Paula', registroProfissional: 'CREA 1' },
  valores: { '[DENOMINACAO_AUTOR]': 'Reclamante', '[NOME_AUTOR]': 'Ana', '[DATA_EXTENSO]': '31 de outubro de 2026' },
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
    expect(variaveisPendentes(html)).toEqual([]);
  });

  it('Word: documento válido com títulos numerados, sumário, lista e tabela', async () => {
    const arquivos = unzipSync(new Uint8Array(await laudoDocx(dados())));
    const documento = strFromU8(arquivos['word/document.xml'] as Uint8Array);
    expect(documento).toContain('1. Objetivo &lt;x&gt;');
    expect(documento).toContain('2.1. Anexo 1');
    expect(documento).toContain('TOC \\h \\o');
    expect(documento).toContain('<w:tbl>');
    expect(documento).toContain('forte');
    const rodape = Object.entries(arquivos).find(([nome]) => nome.startsWith('word/footer'));
    expect(strFromU8(rodape?.[1] as Uint8Array)).toContain('PAGE');
  });
});
