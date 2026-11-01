import type { ReportVariable } from '@ethica/contracts';
import { pendingVariables, REPORT_HTML_TAGS, REPORT_IMG_SRC, REPORT_VARIABLES } from '@ethica/contracts';
import sanitizeHtml from 'sanitize-html';
import { esc } from './document.layout.js';

// Every report and template HTML goes through here before being saved (AD-123): only the tags
// the editor produces and that PDF and Word know how to draw; as attributes, only colspan/rowspan and the
// photo `src`/`alt`. A tag outside the list is dropped and its text stays; script and style are dropped with their
// content. Photos only from the inspection (AD-129): the editor stores the absolute API URL, here the
// path stays; any other image is removed.
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

// Replaces only the markers that have a value; what remains is an issue (AD-126). In HTML the value is
// escaped; in the title (plain text) it goes raw and is escaped when drawn.
export const resolveVariables = (text: string, values: ReportValues, format: 'html' | 'text'): string =>
  REPORT_VARIABLES.reduce((result, variable) => {
    const amount = values[variable]?.trim();
    if (!amount) return result;
    return result.replaceAll(variable, format === 'html' ? esc(amount) : amount);
  }, text);

// Markers still without a value, by section (title and text): they block export and completion (AD-126).
export const issuesOf = (sections: ReadonlyArray<{ id: string; title: string; html: string }>) =>
  sections
    .map((section) => ({ sectionId: section.id, variables: pendingVariables(`${section.title} ${section.html}`) }))
    .filter((issue) => issue.variables.length > 0);
