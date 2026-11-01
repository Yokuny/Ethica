import { numberSections } from '@ethica/contracts';
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { parseDocument } from 'htmlparser2';
import { textsHeaderFooter } from './document.layout.js';
import type { ReportExportData } from './report.schema.js';

// Report in Word (AD-125): the same sanitized HTML (AD-123) read with htmlparser2, tag by tag of the
// allowlist, plus cover, table of contents (field updated on open) and office header/footer.

type No = ReturnType<typeof parseDocument>['children'][number];
type Photos = ReportExportData['photos'];
type Format = { bold?: boolean; italics?: boolean; underline?: boolean };
type Block = Paragraph | Table;

const NUMBERED_LIST = 'report-numbered-list';
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;

const children = (no: No): No[] => ('children' in no ? (no.children as No[]) : []);
const tag = (no: No): string | undefined => (no.type === 'tag' ? no.name : undefined);

const runs = (nos: No[], format: Format = {}): TextRun[] =>
  nos.flatMap((no): TextRun[] => {
    if (no.type === 'text') {
      return no.data ? [new TextRun({ text: no.data, ...format, underline: format.underline ? {} : undefined })] : [];
    }
    switch (tag(no)) {
      case 'br':
        return [new TextRun({ break: 1 })];
      case 'strong':
        return runs(children(no), { ...format, bold: true });
      case 'em':
        return runs(children(no), { ...format, italics: true });
      case 'u':
        return runs(children(no), { ...format, underline: true });
      case 'ul':
      case 'ol':
        return [];
      default:
        return runs(children(no), format);
    }
  });

const tableRows = (no: No): No[] =>
  children(no).flatMap((child) => (tag(child) === 'tr' ? [child] : tag(child) ? tableRows(child) : []));

const hasPhoto = (no: No): boolean => tag(no) === 'img' || children(no).some(hasPhoto);

// Photo grid (LMO-05): two columns of the same width, even with an empty cell. A4 text width = 9638 twips.
const table = (no: No, photos: Photos): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    ...(hasPhoto(no) ? { layout: TableLayoutType.FIXED, columnWidths: [4819, 4819] } : {}),
    rows: tableRows(no).map(
      (tr) =>
        new TableRow({
          children: children(tr)
            .filter((cell) => tag(cell) === 'td' || tag(cell) === 'th')
            .map((cell) => {
              const conteudo = blocks(children(cell), { bold: tag(cell) === 'th' }, photos, true).filter(
                (block): block is Paragraph => block instanceof Paragraph,
              );
              const span = cell.type === 'tag' ? Number(cell.attribs.colspan) || 1 : 1;
              return new TableCell({
                columnSpan: span,
                children: conteudo.length ? conteudo : [new Paragraph({ children: runs(children(cell)) })],
              });
            }),
        }),
    ),
  });

let instanceList = 0;

const list = (no: No, level: number): Paragraph[] => {
  const numbered = tag(no) === 'ol';
  const instance = ++instanceList;
  return children(no)
    .filter((li) => tag(li) === 'li')
    .flatMap((li) => [
      new Paragraph({
        children: runs(children(li)),
        ...(numbered
          ? { numbering: { reference: NUMBERED_LIST, level: Math.min(level, 2), instance } }
          : { bullet: { level: Math.min(level, 2) } }),
      }),
      ...children(li)
        .filter((sub) => tag(sub) === 'ul' || tag(sub) === 'ol')
        .flatMap((sub) => list(sub, level + 1)),
    ]);
};

// Width and height in pixels from the file header: PNG IHDR or JPEG SOF.
export const imageDimensions = (image: Buffer): { width: number; height: number } | null => {
  if (image.subarray(1, 4).toString() === 'PNG')
    return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
  let offset = 2;
  while (offset + 9 < image.length && image[offset] === 0xff) {
    const marker = image[offset + 1] as number;
    // SOF0..SOF15, menos DHT (C4), JPG (C8) e DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: image.readUInt16BE(offset + 5), width: image.readUInt16BE(offset + 7) };
    }
    offset += 2 + image.readUInt16BE(offset + 2);
  }
  return null;
};

// Report photo (AD-129): at most 15 cm wide and 12 cm tall, centered; inside a table cell (photo
// grid, LMO-05), half of that.
const photo = (no: No, photos: Photos, inCell: boolean): Paragraph[] => {
  const src = no.type === 'tag' ? no.attribs.src : undefined;
  const file = src ? photos[src] : undefined;
  const size = file ? imageDimensions(file.body) : null;
  if (!file || !size) return [];
  const scale = Math.min((inCell ? 283 : 567) / size.width, (inCell ? 227 : 454) / size.height, 1);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120 },
      children: [
        new ImageRun({
          type: file.mime === 'image/png' ? 'png' : 'jpg',
          data: file.body,
          transformation: { width: Math.round(size.width * scale), height: Math.round(size.height * scale) },
        }),
      ],
    }),
  ];
};

function blocks(nos: No[], format: Format = {}, photos: Photos = {}, inCell = false): Block[] {
  return nos.flatMap((no): Block[] => {
    switch (tag(no)) {
      case 'p':
        return [
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            children: runs(children(no), format),
          }),
        ];
      // Heading inside the text: bold, left out of the table of contents (which only lists sections).
      case 'h3':
      case 'h4':
        return [new Paragraph({ spacing: { before: 120 }, children: runs(children(no), { ...format, bold: true }) })];
      case 'ul':
      case 'ol':
        return list(no, 0);
      case 'table':
        return [table(no, photos)];
      case 'img':
        return photo(no, photos, inCell);
      default: {
        const text = runs([no], format);
        return text.length ? [new Paragraph({ children: text })] : [];
      }
    }
  });
}

const templateRows = (text: string, logo: Buffer | undefined, expertName: string): Paragraph[] =>
  text
    .split('\n')
    .map((row) => row.trim())
    .filter((row) => row && (row !== '[LOGO]' || logo))
    .map(
      (row) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: row
            .split(/(\[LOGO\]|\[NOME_PERITO\]|\[PAGINA_ATUAL\]|\[TOTAL_PAGINAS\])/)
            .filter(Boolean)
            .map((party) => {
              if (party === '[LOGO]') {
                if (!logo) return new TextRun('');
                const { width, height } = imageDimensions(logo) ?? { width: 1, height: 1 };
                const scale = Math.min(45 / height, 227 / width, 1);
                return new ImageRun({
                  type: 'png',
                  data: logo,
                  transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
                });
              }
              if (party === '[NOME_PERITO]') return new TextRun({ text: expertName, size: 17, color: '57606A' });
              if (party === '[PAGINA_ATUAL]')
                return new TextRun({ children: [PageNumber.CURRENT], size: 17, color: '57606A' });
              if (party === '[TOTAL_PAGINAS]') {
                return new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: '57606A' });
              }
              return new TextRun({ text: party, size: 17, color: '57606A' });
            }),
        }),
    );

const TYPE = { report: 'LAUDO PERICIAL', technical_opinion: 'PARECER TÉCNICO' } as const;

export const reportDocx = async ({
  report,
  legalCase,
  identity,
  expert,
  values,
  photos,
}: ReportExportData): Promise<Buffer> => {
  const numbers = numberSections(report.sections);
  const logo = identity.logoDataUrl
    ? Buffer.from(identity.logoDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
    : undefined;
  const { header, footer } = textsHeaderFooter(identity);
  const coverRow = (label: string | undefined, amount: string | undefined): Paragraph[] =>
    label && amount
      ? [
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(amount)],
          }),
        ]
      : [];
  const cover = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1800, after: 900 },
      children: [new TextRun({ text: TYPE[report.type], bold: true, size: 40 })],
    }),
    ...coverRow('Processo nº', legalCase.processNumber),
    ...coverRow('Juízo', [legalCase.division, legalCase.district].filter(Boolean).join(' — ') || undefined),
    ...coverRow('Tribunal', legalCase.court),
    ...coverRow(values['[DENOMINACAO_AUTOR]'], values['[NOME_AUTOR]']),
    ...coverRow(values['[DENOMINACAO_REU]'], values['[NOME_REU]']),
    ...coverRow('Objeto', legalCase.subject),
    ...[expert.name, expert.education, expert.professionalRegistration, values['[DATA_EXTENSO]']]
      .filter((row): row is string => Boolean(row))
      .map(
        (row, i) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: i === 0 ? 2400 : 0 },
            children: [new TextRun({ text: row, bold: i === 0 })],
          }),
      ),
  ];
  const sections = report.sections.flatMap((section, i) => [
    new Paragraph({
      heading: HEADINGS[Math.min(section.level, 3) - 1],
      pageBreakBefore: section.pageBreak,
      children: [new TextRun(`${numbers[i]}. ${section.title}`)],
    }),
    ...(section.titleOnly ? [] : blocks(parseDocument(section.html).children as No[], {}, photos)),
  ]);
  const doc = new Document({
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: { bold: true, size: 26, allCaps: true, color: '000000' },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: { bold: true, size: 24, color: '000000' },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: { bold: true, italics: true, size: 24, color: '000000' },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: NUMBERED_LIST,
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1900, bottom: 1250, left: 1700, right: 1130, header: 600, footer: 500 } },
        },
        headers: { default: new Header({ children: templateRows(header, logo, expert.name) }) },
        footers: { default: new Footer({ children: templateRows(footer, logo, expert.name) }) },
        children: [
          ...cover,
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SUMÁRIO', bold: true })] }),
          new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }),
          new Paragraph({ children: [new PageBreak()] }),
          ...sections,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
};
