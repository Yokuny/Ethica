import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';
import { describe, expect, it } from 'vitest';
import { templateSectionsFromDocx, templateSectionsFromText } from './report.attachment.js';

describe('templateSectionsFromText (ANL-04)', () => {
  it('numbered headings become items by level; text before them goes in an unnumbered item', () => {
    const text = [
      'Excelentíssimo Senhor Juiz',
      'Página 1 de 3',
      '1. OBJETIVO',
      'O presente laudo tem por objetivo apurar',
      'a insalubridade alegada.',
      'Segundo parágrafo.',
      '2.1 - Metodologia',
      '2.1.1.4 Detalhe',
      '3. Foram analisados os documentos.',
    ].join('\n');
    expect(templateSectionsFromText(text, 'Laudo')).toEqual([
      expect.objectContaining({
        title: 'Laudo',
        level: 1,
        unnumbered: true,
        yesText: '<p>Excelentíssimo Senhor Juiz</p>',
      }),
      expect.objectContaining({
        title: 'OBJETIVO',
        level: 1,
        unnumbered: false,
        yesText: '<p>O presente laudo tem por objetivo apurar a insalubridade alegada.</p><p>Segundo parágrafo.</p>',
      }),
      expect.objectContaining({ title: 'Metodologia', level: 2, yesText: '' }),
      // Deeper than the template allows → last level; a numbered sentence is text, not a heading.
      expect.objectContaining({ title: 'Detalhe', level: 3, yesText: '<p>3. Foram analisados os documentos.</p>' }),
    ]);
  });

  it('without headings, the whole text is one item; HTML is escaped', () => {
    expect(templateSectionsFromText('a < b & c', 'Laudo')).toEqual([
      expect.objectContaining({ title: 'Laudo', yesText: '<p>a &lt; b &amp; c</p>' }),
    ]);
  });
});

describe('importar modelo (BIB-04)', () => {
  it('PDF: o sumário (pontilhado ou sem texto e repetido depois) não vira item', () => {
    const text = [
      'SUMÁRIO',
      '1. OBJETIVO ................................ 4',
      '2. VISTORIA . . . . . . . . . 5',
      '3. CONCLUSÃO',
      '1. OBJETIVO',
      'Apurar a insalubridade.',
      '2. VISTORIA',
      'Realizada no local.',
      '3. CONCLUSÃO',
      'Não há insalubridade.',
    ].join('\n');
    expect(templateSectionsFromText(text, 'Laudo').map((section) => section.title)).toEqual([
      'OBJETIVO',
      'VISTORIA',
      'CONCLUSÃO',
    ]);
  });

  it('Word: estilos de título e títulos numerados viram itens; negrito, listas e tabela ficam no texto', async () => {
    const document = new Document({
      numbering: {
        config: [
          {
            reference: 'quesitos',
            levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }],
          },
        ],
      },
      sections: [
        {
          children: [
            new Paragraph('Excelentíssimo Senhor Juiz'),
            new Paragraph({ text: 'Objetivo', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ children: [new TextRun('Apurar a '), new TextRun({ text: 'insalubridade', bold: true })] }),
            new Paragraph({ text: 'Metodologia', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: 'Primeiro quesito', numbering: { reference: 'quesitos', level: 0 } }),
            new Paragraph({ text: 'Segundo quesito', numbering: { reference: 'quesitos', level: 0 } }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph('Agente')] }),
                    new TableCell({ children: [new Paragraph('Ruído')] }),
                  ],
                }),
              ],
            }),
            new Paragraph('3. CONCLUSÃO'),
            new Paragraph({ children: [new TextRun({ text: 'Sem risco', italics: true })] }),
          ],
        },
      ],
    });
    const sections = templateSectionsFromDocx(await Packer.toBuffer(document), 'Meu modelo');
    expect(sections.map(({ title, level, unnumbered }) => ({ title, level, unnumbered }))).toEqual([
      { title: 'Meu modelo', level: 1, unnumbered: true },
      { title: 'Objetivo', level: 1, unnumbered: false },
      { title: 'Metodologia', level: 2, unnumbered: false },
      { title: 'CONCLUSÃO', level: 1, unnumbered: false },
    ]);
    expect(sections[1]?.yesText).toBe('<p>Apurar a <strong>insalubridade</strong></p>');
    expect(sections[2]?.yesText).toBe(
      '<ol><li>Primeiro quesito</li><li>Segundo quesito</li></ol><table><tbody><tr><td><p>Agente</p></td><td><p>Ruído</p></td></tr></tbody></table>',
    );
    expect(sections[3]?.yesText).toBe('<p><em>Sem risco</em></p>');
  });

  it('Word: arquivo que não é .docx é recusado', () => {
    expect(() => templateSectionsFromDocx(Buffer.from('não é zip'), 'x')).toThrow('unsupported_file_type');
  });
});
