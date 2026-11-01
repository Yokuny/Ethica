import { numerarSecoes } from '@ethica/contracts';
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
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { parseDocument } from 'htmlparser2';
import { textosCabecalhoRodape } from './documento.layout.js';
import type { LaudoExportDados } from './laudo.schema.js';

// Laudo em Word (AD-125): o mesmo HTML saneado (AD-123) lido com htmlparser2, tag por tag da
// allowlist, mais capa, sumário (campo atualizado ao abrir) e cabeçalho/rodapé do escritório.

type No = ReturnType<typeof parseDocument>['children'][number];
type Photos = LaudoExportDados['photos'];
type Formato = { bold?: boolean; italics?: boolean; underline?: boolean };
type Bloco = Paragraph | Table;

const LISTA_NUMERADA = 'laudo-lista-numerada';
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;

const filhos = (no: No): No[] => ('children' in no ? (no.children as No[]) : []);
const tag = (no: No): string | undefined => (no.type === 'tag' ? no.name : undefined);

const runs = (nos: No[], formato: Formato = {}): TextRun[] =>
  nos.flatMap((no): TextRun[] => {
    if (no.type === 'text') {
      return no.data ? [new TextRun({ text: no.data, ...formato, underline: formato.underline ? {} : undefined })] : [];
    }
    switch (tag(no)) {
      case 'br':
        return [new TextRun({ break: 1 })];
      case 'strong':
        return runs(filhos(no), { ...formato, bold: true });
      case 'em':
        return runs(filhos(no), { ...formato, italics: true });
      case 'u':
        return runs(filhos(no), { ...formato, underline: true });
      case 'ul':
      case 'ol':
        return [];
      default:
        return runs(filhos(no), formato);
    }
  });

const linhasDaTabela = (no: No): No[] =>
  filhos(no).flatMap((filho) => (tag(filho) === 'tr' ? [filho] : tag(filho) ? linhasDaTabela(filho) : []));

const tabela = (no: No, photos: Photos): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: linhasDaTabela(no).map(
      (tr) =>
        new TableRow({
          children: filhos(tr)
            .filter((celula) => tag(celula) === 'td' || tag(celula) === 'th')
            .map((celula) => {
              const conteudo = blocos(filhos(celula), { bold: tag(celula) === 'th' }, photos).filter(
                (bloco): bloco is Paragraph => bloco instanceof Paragraph,
              );
              const span = celula.type === 'tag' ? Number(celula.attribs.colspan) || 1 : 1;
              return new TableCell({
                columnSpan: span,
                children: conteudo.length ? conteudo : [new Paragraph({ children: runs(filhos(celula)) })],
              });
            }),
        }),
    ),
  });

let instanciaLista = 0;

const lista = (no: No, nivel: number): Paragraph[] => {
  const numerada = tag(no) === 'ol';
  const instance = ++instanciaLista;
  return filhos(no)
    .filter((li) => tag(li) === 'li')
    .flatMap((li) => [
      new Paragraph({
        children: runs(filhos(li)),
        ...(numerada
          ? { numbering: { reference: LISTA_NUMERADA, level: Math.min(nivel, 2), instance } }
          : { bullet: { level: Math.min(nivel, 2) } }),
      }),
      ...filhos(li)
        .filter((sub) => tag(sub) === 'ul' || tag(sub) === 'ol')
        .flatMap((sub) => lista(sub, nivel + 1)),
    ]);
};

// Largura e altura em pixels pelo cabeçalho do arquivo: IHDR do PNG ou SOF do JPEG.
export const dimensoesDaImagem = (imagem: Buffer): { width: number; height: number } | null => {
  if (imagem.subarray(1, 4).toString() === 'PNG')
    return { width: imagem.readUInt32BE(16), height: imagem.readUInt32BE(20) };
  let offset = 2;
  while (offset + 9 < imagem.length && imagem[offset] === 0xff) {
    const marcador = imagem[offset + 1] as number;
    // SOF0..SOF15, menos DHT (C4), JPG (C8) e DAC (CC).
    if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
      return { height: imagem.readUInt16BE(offset + 5), width: imagem.readUInt16BE(offset + 7) };
    }
    offset += 2 + imagem.readUInt16BE(offset + 2);
  }
  return null;
};

// Foto da vistoria (AD-129): no máximo 15 cm de largura e 12 cm de altura, centralizada.
const photo = (no: No, photos: Photos): Paragraph[] => {
  const src = no.type === 'tag' ? no.attribs.src : undefined;
  const arquivo = src ? photos[src] : undefined;
  const tamanho = arquivo ? dimensoesDaImagem(arquivo.body) : null;
  if (!arquivo || !tamanho) return [];
  const escala = Math.min(567 / tamanho.width, 454 / tamanho.height, 1);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120 },
      children: [
        new ImageRun({
          type: arquivo.mime === 'image/png' ? 'png' : 'jpg',
          data: arquivo.body,
          transformation: { width: Math.round(tamanho.width * escala), height: Math.round(tamanho.height * escala) },
        }),
      ],
    }),
  ];
};

function blocos(nos: No[], formato: Formato = {}, photos: Photos = {}): Bloco[] {
  return nos.flatMap((no): Bloco[] => {
    switch (tag(no)) {
      case 'p':
        return [
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            children: runs(filhos(no), formato),
          }),
        ];
      // Título dentro do texto: negrito, fora do sumário (que lista só as seções).
      case 'h3':
      case 'h4':
        return [new Paragraph({ spacing: { before: 120 }, children: runs(filhos(no), { ...formato, bold: true }) })];
      case 'ul':
      case 'ol':
        return lista(no, 0);
      case 'table':
        return [tabela(no, photos)];
      case 'img':
        return photo(no, photos);
      default: {
        const texto = runs([no], formato);
        return texto.length ? [new Paragraph({ children: texto })] : [];
      }
    }
  });
}

const linhasDoTemplate = (texto: string, logo: Buffer | undefined, expertName: string): Paragraph[] =>
  texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha && (linha !== '[LOGO]' || logo))
    .map(
      (linha) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: linha
            .split(/(\[LOGO\]|\[NOME_PERITO\]|\[PAGINA_ATUAL\]|\[TOTAL_PAGINAS\])/)
            .filter(Boolean)
            .map((party) => {
              if (party === '[LOGO]') {
                if (!logo) return new TextRun('');
                const { width, height } = dimensoesDaImagem(logo) ?? { width: 1, height: 1 };
                const escala = Math.min(45 / height, 227 / width, 1);
                return new ImageRun({
                  type: 'png',
                  data: logo,
                  transformation: { width: Math.round(width * escala), height: Math.round(height * escala) },
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

const TIPO = { report: 'LAUDO PERICIAL', technical_opinion: 'PARECER TÉCNICO' } as const;

export const laudoDocx = async ({
  laudo,
  legalCase,
  identity,
  expert,
  values,
  photos,
}: LaudoExportDados): Promise<Buffer> => {
  const numeros = numerarSecoes(laudo.secoes);
  const logo = identity.logoDataUrl
    ? Buffer.from(identity.logoDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
    : undefined;
  const { cabecalho, rodape } = textosCabecalhoRodape(identity);
  const coverRow = (rotulo: string | undefined, amount: string | undefined): Paragraph[] =>
    rotulo && amount
      ? [
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: `${rotulo}: `, bold: true }), new TextRun(amount)],
          }),
        ]
      : [];
  const cover = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1800, after: 900 },
      children: [new TextRun({ text: TIPO[laudo.tipo], bold: true, size: 40 })],
    }),
    ...coverRow('Processo nº', legalCase.processNumber),
    ...coverRow('Juízo', [legalCase.division, legalCase.district].filter(Boolean).join(' — ') || undefined),
    ...coverRow('Tribunal', legalCase.court),
    ...coverRow(values['[DENOMINACAO_AUTOR]'], values['[NOME_AUTOR]']),
    ...coverRow(values['[DENOMINACAO_REU]'], values['[NOME_REU]']),
    ...coverRow('Objeto', legalCase.subject),
    ...[expert.name, expert.formacao, expert.registroProfissional, values['[DATA_EXTENSO]']]
      .filter((linha): linha is string => Boolean(linha))
      .map(
        (linha, i) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: i === 0 ? 2400 : 0 },
            children: [new TextRun({ text: linha, bold: i === 0 })],
          }),
      ),
  ];
  const secoes = laudo.secoes.flatMap((secao, i) => [
    new Paragraph({
      heading: HEADINGS[Math.min(secao.nivel, 3) - 1],
      pageBreakBefore: secao.quebraPagina,
      children: [new TextRun(`${numeros[i]}. ${secao.titulo}`)],
    }),
    ...(secao.apenasTitulo ? [] : blocos(parseDocument(secao.html).children as No[], {}, photos)),
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
          reference: LISTA_NUMERADA,
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
        headers: { default: new Header({ children: linhasDoTemplate(cabecalho, logo, expert.name) }) },
        footers: { default: new Footer({ children: linhasDoTemplate(rodape, logo, expert.name) }) },
        children: [
          ...cover,
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SUMÁRIO', bold: true })] }),
          new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }),
          new Paragraph({ children: [new PageBreak()] }),
          ...secoes,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
};
