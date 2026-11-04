import { describe, expect, it } from 'vitest';
import { templateSectionsFromText } from './report.attachment.js';

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
