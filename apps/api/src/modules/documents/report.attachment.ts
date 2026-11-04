import { REPORT_LEVEL_MAX, REPORT_SECTIONS_MAX, type TemplateSection } from '@ethica/contracts';
import { esc } from './document.layout.js';

// Attached report saved as a template (ANL-04): rules over the PDF text, like the process (AD-152).
// A numbered heading ("1. OBJETIVO", "2.1 Metodologia") opens an item of the level of the number; the
// lines below are its text. The number itself is dropped, because the template numbers by position.

// Number, optional dot/dash, title starting with a letter, without the end of a sentence.
const HEADING = /^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s*[-–—)]?\s+(\p{Lu}.{0,150})$/u;
const SENTENCE_END = /[.;,]$/;
const PAGE_MARK = /^(p[áa]gina|p[áa]g\.?|fls?\.?)\s*\d+(\s*(de|\/)\s*\d+)?$/i;
const PARAGRAPH_END = /[.:;!?]$/;
const TITLE_MAX = 200;
const HTML_MAX = 190_000;

// PDF lines break in the middle of the sentence: a paragraph ends on a line that ends a sentence.
const toHtml = (lines: string[]): string => {
  const paragraphs: string[] = [];
  let current = '';
  for (const line of lines) {
    current = current ? `${current} ${line}` : line;
    if (PARAGRAPH_END.test(line)) {
      paragraphs.push(current);
      current = '';
    }
  }
  if (current) paragraphs.push(current);
  return paragraphs
    .map((paragraph) => `<p>${esc(paragraph)}</p>`)
    .join('')
    .slice(0, HTML_MAX);
};

// Text before the first heading (or the whole text, without headings) goes in an unnumbered item named `title`.
export const templateSectionsFromText = (text: string, title: string): TemplateSection[] => {
  const blocks: Array<{ title: string; level: number; unnumbered: boolean; lines: string[] }> = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || PAGE_MARK.test(line)) continue;
    const heading = line.match(HEADING);
    if (heading && !SENTENCE_END.test(line)) {
      const level = Math.min((heading[1] as string).split('.').length, REPORT_LEVEL_MAX);
      blocks.push({ title: (heading[2] as string).slice(0, TITLE_MAX), level, unnumbered: false, lines: [] });
      continue;
    }
    if (!blocks.length) blocks.push({ title: title.slice(0, TITLE_MAX), level: 1, unnumbered: true, lines: [] });
    (blocks.at(-1) as { lines: string[] }).lines.push(line);
  }
  return blocks.slice(0, REPORT_SECTIONS_MAX).map((block) => ({
    title: block.title,
    level: block.level,
    titleOnly: false,
    pageBreak: false,
    unnumbered: block.unnumbered,
    yesText: toHtml(block.lines),
    noText: '',
  }));
};
