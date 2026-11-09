import { REPORT_LEVEL_MAX, REPORT_SECTIONS_MAX, type TemplateSection } from '@ethica/contracts';
import { unzipSync } from 'fflate';
import { parseDocument } from 'htmlparser2';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import { esc } from './document.layout.js';

// PDF or Word turned into template items (ANL-04, BIB-04), by rules like the process (AD-152, AD-205).
// A numbered heading ("1. OBJETIVO", "2.1 Metodologia") or a Word heading style opens an item of its level;
// what comes below is its text. The number itself is dropped, because the template numbers by position.
// The table of contents of the file is skipped.

// Number, optional dot/dash, title starting with a letter, without the end of a sentence.
const HEADING = /^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s*[-–—)]?\s+(\p{Lu}.{0,150})$/u;
const SENTENCE_END = /[.;,]$/;
const PAGE_MARK = /^(p[áa]gina|p[áa]g\.?|fls?\.?)\s*\d+(\s*(de|\/)\s*\d+)?$/i;
// A line of the table of contents: dot leaders ("OBJETIVO ........ 4") or the "Sumário" title itself.
const SUMMARY_LINE = /(\.\s?){4,}|…{2,}|^(sum[áa]rio|[íi]ndice)$/i;
const PARAGRAPH_END = /[.:;!?]$/;
const TITLE_MAX = 200;
const HTML_MAX = 190_000;

type Block = { title: string; level: number; unnumbered: boolean; body: string[] };

const headingOf = (line: string): { level: number; title: string } | undefined => {
  const heading = line.match(HEADING);
  if (!heading || SENTENCE_END.test(line)) return undefined;
  return {
    level: Math.min((heading[1] as string).split('.').length, REPORT_LEVEL_MAX),
    title: (heading[2] as string).slice(0, TITLE_MAX),
  };
};

const skipped = (line: string): boolean => !line || PAGE_MARK.test(line) || SUMMARY_LINE.test(line);

// Text before the first heading (or the whole text, without headings) goes in an unnumbered item named `title`.
// A heading left without text that repeats later came from a table of contents without dot leaders.
const toSections = (blocks: Block[], html: (body: string[]) => string): TemplateSection[] =>
  blocks
    .filter(
      (block, index) => block.body.length > 0 || !blocks.slice(index + 1).some((later) => later.title === block.title),
    )
    .slice(0, REPORT_SECTIONS_MAX)
    .map((block) => ({
      title: block.title,
      level: block.level,
      titleOnly: false,
      pageBreak: false,
      unnumbered: block.unnumbered,
      yesText: html(block.body).slice(0, HTML_MAX),
      noText: '',
    }));

const append = (blocks: Block[], title: string, part: string): void => {
  if (!blocks.length) blocks.push({ title: title.slice(0, TITLE_MAX), level: 1, unnumbered: true, body: [] });
  (blocks.at(-1) as Block).body.push(part);
};

// PDF lines break in the middle of the sentence: a paragraph ends on a line that ends a sentence.
const linesToHtml = (lines: string[]): string => {
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
  return paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
};

export const templateSectionsFromText = (text: string, title: string): TemplateSection[] => {
  const blocks: Block[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (skipped(line)) continue;
    const heading = headingOf(line);
    if (heading) blocks.push({ ...heading, unnumbered: false, body: [] });
    else append(blocks, title, line);
  }
  return toSections(blocks, linesToHtml);
};

// --- Word (.docx) --------------------------------------------------------------
// The file is a zip; the text is in word/document.xml, the heading styles in word/styles.xml and the list kind
// (bullet or numbered) in word/numbering.xml.

type Node = ReturnType<typeof parseDocument>['children'][number];
type Element = Extract<Node, { attribs: Record<string, string> }>;

const isElement = (node: Node): node is Element => 'attribs' in node;
const children = (node: Element, name?: string): Element[] =>
  node.children.filter(isElement).filter((child) => !name || child.name === name);
// Every element `name` inside `nodes`, in document order.
const find = (name: string, nodes: Node[]): Element[] =>
  nodes.filter(isElement).flatMap((node) => [...(node.name === name ? [node] : []), ...find(name, node.children)]);
const textOf = (node: Node): string =>
  node.type === 'text' ? node.data : 'children' in node ? (node.children as Node[]).map(textOf).join('') : '';
const child = (node: Element | undefined, name: string): Element | undefined =>
  node ? children(node, name)[0] : undefined;
const val = (node: Element | undefined): string | undefined => node?.attribs['w:val'];
const on = (node: Element | undefined): boolean => Boolean(node) && !['0', 'false', 'none'].includes(val(node) ?? '');

const xml = (files: Record<string, Uint8Array>, name: string): Element[] => {
  const file = files[name];
  return file ? parseDocument(new TextDecoder().decode(file), { xmlMode: true }).children.filter(isElement) : [];
};

// Heading level of each style id: "heading 1" (any language keeps the English name) or an outline level.
const headingStyles = (styles: Element[]): Map<string, number> => {
  const levels = new Map<string, number>();
  for (const style of find('w:style', styles)) {
    const id = style.attribs['w:styleId'];
    const name = val(child(style, 'w:name')) ?? '';
    const outline = val(child(child(style, 'w:pPr'), 'w:outlineLvl'));
    const level =
      name.match(/^heading (\d)$/i)?.[1] ?? (outline !== undefined ? String(Number(outline) + 1) : undefined);
    if (id && level && /^toc/i.test(name) === false) levels.set(id, Math.min(Number(level), REPORT_LEVEL_MAX));
  }
  return levels;
};

const tocStyles = (styles: Element[]): Set<string> =>
  new Set(
    find('w:style', styles)
      .filter((style) => /^toc/i.test(val(child(style, 'w:name')) ?? ''))
      .map((style) => style.attribs['w:styleId'] ?? ''),
  );

// numId → bullet list (true) or numbered list (false), by the format of the first level.
const listKinds = (numbering: Element[]): Map<string, boolean> => {
  const abstract = new Map(
    find('w:abstractNum', numbering).map((item) => [
      item.attribs['w:abstractNumId'],
      val(child(child(item, 'w:lvl'), 'w:numFmt')) === 'bullet',
    ]),
  );
  return new Map(
    find('w:num', numbering).map((item) => [
      item.attribs['w:numId'] ?? '',
      abstract.get(val(child(item, 'w:abstractNumId')) ?? '') ?? true,
    ]),
  );
};

const runHtml = (run: Element): string => {
  const props = child(run, 'w:rPr');
  let text = '';
  for (const part of children(run)) {
    if (part.name === 'w:t') text += esc(textOf(part));
    else if (part.name === 'w:tab') text += ' ';
    else if (part.name === 'w:br' || part.name === 'w:cr') text += '<br />';
  }
  if (!text) return '';
  if (on(child(props, 'w:u'))) text = `<u>${text}</u>`;
  if (on(child(props, 'w:i'))) text = `<em>${text}</em>`;
  if (on(child(props, 'w:b'))) text = `<strong>${text}</strong>`;
  return text;
};

const paragraphHtml = (paragraph: Element): string => find('w:r', [paragraph]).map(runHtml).join('').trim();

const paragraphText = (paragraph: Element): string =>
  find('w:t', [paragraph])
    .map((text) => textOf(text))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

const tableHtml = (table: Element): string =>
  `<table><tbody>${children(table, 'w:tr')
    .map(
      (row) =>
        `<tr>${children(row, 'w:tc')
          .map(
            (cell) =>
              `<td>${find('w:p', [cell])
                .map((paragraph) => paragraphHtml(paragraph))
                .filter(Boolean)
                .map((html) => `<p>${html}</p>`)
                .join('')}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')}</tbody></table>`;

export const templateSectionsFromDocx = (file: Buffer, title: string): TemplateSection[] => {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(file), {
      filter: ({ name }) => ['word/document.xml', 'word/styles.xml', 'word/numbering.xml'].includes(name),
    });
  } catch {
    throw new CustomError('unsupported_file_type', 415);
  }
  const body = find('w:body', xml(files, 'word/document.xml'))[0];
  if (!body) throw new CustomError('unsupported_file_type', 415);
  const styles = xml(files, 'word/styles.xml');
  const headings = headingStyles(styles);
  const toc = tocStyles(styles);
  const lists = listKinds(xml(files, 'word/numbering.xml'));

  const blocks: Block[] = [];
  // Consecutive list paragraphs become one list; any other block closes it.
  let list: { bullet: boolean; items: string[] } | undefined;
  const closeList = () => {
    if (list)
      append(blocks, title, `<${list.bullet ? 'ul' : 'ol'}>${list.items.join('')}</${list.bullet ? 'ul' : 'ol'}>`);
    list = undefined;
  };

  for (const node of children(body)) {
    if (node.name === 'w:tbl') {
      closeList();
      append(blocks, title, tableHtml(node));
      continue;
    }
    if (node.name !== 'w:p') continue;
    const props = child(node, 'w:pPr');
    const style = val(child(props, 'w:pStyle')) ?? '';
    const text = paragraphText(node);
    if (toc.has(style) || skipped(text)) continue;
    const outline = val(child(props, 'w:outlineLvl'));
    const styled = headings.get(style) ?? (outline !== undefined ? Number(outline) + 1 : undefined);
    const heading = styled
      ? { level: Math.min(styled, REPORT_LEVEL_MAX), title: (headingOf(text)?.title ?? text).slice(0, TITLE_MAX) }
      : headingOf(text);
    if (heading) {
      closeList();
      blocks.push({ ...heading, unnumbered: false, body: [] });
      continue;
    }
    const numId = val(child(child(props, 'w:numPr'), 'w:numId'));
    const html = paragraphHtml(node);
    if (numId && numId !== '0') {
      const bullet = lists.get(numId) ?? true;
      if (list && list.bullet !== bullet) closeList();
      list ??= { bullet, items: [] };
      list.items.push(`<li>${html}</li>`);
      continue;
    }
    closeList();
    append(blocks, title, `<p>${html}</p>`);
  }
  closeList();
  return toSections(blocks, (parts) => parts.join(''));
};
