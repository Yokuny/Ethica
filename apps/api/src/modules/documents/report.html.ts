import type { ReportVariable } from '@ethica/contracts';
import { pendingVariables, REPORT_HTML_TAGS, REPORT_IMG_SRC, REPORT_VARIABLES } from '@ethica/contracts';
import sanitizeHtml from 'sanitize-html';
import { esc } from './document.layout.js';

// Todo HTML do laudo e dos modelos passa por aqui antes de ser gravado (AD-123): só as tags
// que o editor produz e que o PDF e o Word sabem desenhar; atributo, só colspan/rowspan e o
// `src`/`alt` da foto. Tag fora da lista some e o texto dela fica; script e style somem com o
// conteúdo. Foto só da vistoria (AD-129): o editor grava a URL absoluta da API, aqui fica o
// caminho; qualquer outra imagem é removida.
export const sanitizeReportHtml = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: [...REPORT_HTML_TAGS],
    allowedAttributes: { th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'], img: ['src', 'alt'] },
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, src: (attribs.src ?? '').replace(/^https?:\/\/[^/]+/, '') },
      }),
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !REPORT_IMG_SRC.test(frame.attribs.src ?? ''),
  }).trim();

export type ReportValues = Partial<Record<ReportVariable, string>>;

// Troca só os marcadores que têm valor; o que fica é pendência (AD-126). No HTML o valor é
// escapado; no título (texto simples) vai cru e é escapado na hora de desenhar.
export const resolveVariables = (text: string, values: ReportValues, format: 'html' | 'text'): string =>
  REPORT_VARIABLES.reduce((result, variable) => {
    const amount = values[variable]?.trim();
    if (!amount) return result;
    return result.replaceAll(variable, format === 'html' ? esc(amount) : amount);
  }, text);

// Marcadores ainda sem valor, por seção (título e texto): bloqueiam exportar e concluir (AD-126).
export const issuesOf = (sections: ReadonlyArray<{ id: string; title: string; html: string }>) =>
  sections
    .map((section) => ({ sectionId: section.id, variables: pendingVariables(`${section.title} ${section.html}`) }))
    .filter((issue) => issue.variables.length > 0);
