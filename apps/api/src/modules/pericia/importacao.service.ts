import {
  type ApiMessageKey,
  type CreatePericia,
  CSV_IMPORT_COLUMNS,
  CSV_IMPORT_MAX_ROWS,
  CSV_IMPORT_REQUIRED_COLUMNS,
  createPericiaSchema,
  documentoSchema,
  type Justica,
  numeroProcessoSchema,
  oabSchema,
  type PericiaParteInput,
  type Polo,
} from '@ethica/contracts';
import { extractText } from 'unpdf';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { CsvImportColumn, CsvImportResult, PdfDraft, PdfExtraction } from './importacao.schema.js';
import * as periciaRepository from './pericia.repository.js';
import * as periciaService from './pericia.service.js';

// --- Órgão pelo número CNJ (AD-118) ------------------------------------------
// NNNNNNN-DD.AAAA.J.TR.OOOO: J é o segmento da justiça, TR o tribunal.
// Código TR da justiça estadual, em ordem: 01 = AC … 27 = TO.
const UF_POR_TR = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SE SP TO'.split(' ');

export const orgaoDoNumero = (numero: string): { justica: Justica; tribunal: string } | undefined => {
  const [, j, tr] = numero.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/) ?? [];
  const codigo = Number(tr);
  if (j === '5' && codigo >= 1 && codigo <= 24) return { justica: 'labor', tribunal: `TRT${codigo}` };
  if (j === '4' && codigo >= 1 && codigo <= 6) return { justica: 'federal', tribunal: `TRF${codigo}` };
  const uf = UF_POR_TR[codigo - 1];
  if (j === '8' && uf) return { justica: 'civil', tribunal: `TJ${uf}` };
  return undefined;
};

// --- Datas --------------------------------------------------------------------
const MESES = 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split(' ');

// `DD/MM/AAAA` ou `AAAA-MM-DD` → `YYYY-MM-DD`; data impossível (31/02) → undefined.
export const parseData = (raw: string): string | undefined => {
  const value = raw.trim();
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [ano, mes, dia] = br ? [br[3], br[2], br[1]] : iso ? [iso[1], iso[2], iso[3]] : [];
  if (!ano || !mes || !dia) return undefined;
  const date = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (date.getUTCMonth() !== Number(mes) - 1 || date.getUTCDate() !== Number(dia)) return undefined;
  return date.toISOString().slice(0, 10);
};

const somarDias = (dia: string, dias: number): string => {
  const date = new Date(`${dia}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
};

// --- Extração da ata/despacho (AD-114) ----------------------------------------
const CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
// Rótulos do cabeçalho do PJe; o advogado que vem depois pertence ao último polo lido.
const ROTULO_POLO: [RegExp, Polo][] = [
  [/^(RECLAMANTE|AUTORA?|REQUERENTE|EXEQUENTE)S?\s*:/i, 'plaintiff'],
  [/^(RECLAMAD[OA]|R[ÉE]U|R[ÉE]|REQUERID[OA]|EXECUTAD[OA])S?\s*:/i, 'defendant'],
];
const ROTULO_ADVOGADO = /^ADVOGAD[OA]S?\s*:/i;
const OAB = /OAB\s*[:/]?\s*([A-Z]{2}\s*[\d.]+|[\d.]+\s*\/?\s*[A-Z]{2})/i;
const CPF_CNPJ = /(?:CPF|CNPJ)\s*:?\s*([\d./-]{11,18})/i;

const OBJETOS: [RegExp, string][] = [
  [/insalubridade/i, 'insalubridade'],
  [/periculosidade/i, 'periculosidade'],
  [/ergon[ôo]mic/i, 'ergonomia'],
  [/(per[íi]cia|perito)\s+m[ée]dic|doen[çc]a ocupacional|acidente de trabalho/i, 'médica'],
  [/cont[áa]bil/i, 'contábil'],
  [/grafot[ée]cnic/i, 'grafotécnica'],
  [/engenharia/i, 'engenharia'],
];

const limparNome = (raw: string): string =>
  raw
    .replace(CPF_CNPJ, '')
    .replace(OAB, '')
    .replace(/\s+-\s*$|[,;]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const extrairPartes = (linhas: string[]): PericiaParteInput[] => {
  const partes: PericiaParteInput[] = [];
  let polo: Polo | undefined;
  for (const linha of linhas) {
    const rotulo = ROTULO_POLO.find(([regex]) => regex.test(linha));
    if (rotulo) {
      polo = rotulo[1];
      const resto = linha.replace(rotulo[0], '');
      const nome = limparNome(resto);
      const documento = documentoSchema.safeParse(resto.match(CPF_CNPJ)?.[1] ?? '');
      if (nome) partes.push({ polo, tipo: 'party', nome, documento: documento.success ? documento.data : undefined });
      continue;
    }
    if (polo && ROTULO_ADVOGADO.test(linha)) {
      const resto = linha.replace(ROTULO_ADVOGADO, '');
      const nome = limparNome(resto);
      const oab = oabSchema.safeParse(resto.match(OAB)?.[1] ?? '');
      if (nome) partes.push({ polo, tipo: 'lawyer', nome, oab: oab.success ? oab.data : undefined });
    }
  }
  return partes;
};

const extrairVara = (linhas: string[], texto: string): Pick<PdfDraft, 'vara' | 'comarca'> => {
  const comarcaRotulada = texto.match(/\b(?:Comarca|Foro)\s+(?:de|da|do)\s+([A-ZÀ-Ú][^\n,–-]*)/)?.[1]?.trim();
  const linha = linhas.find((l) => /\bVara\b/i.test(l) && l.length <= 120);
  if (!linha) return { comarca: comarcaRotulada };
  // "1ª Vara do Trabalho de São Paulo" → vara "1ª Vara do Trabalho", comarca "São Paulo".
  const separada = linha.match(
    /^(.*\bVara\b.*?(?:Trabalho|Federal|C[íi]vel|Criminal)[^\n]*?)\s+de\s+([A-ZÀ-Ú][^\n]*)$/,
  );
  return separada
    ? { vara: separada[1]?.trim(), comarca: comarcaRotulada ?? separada[2]?.trim() }
    : { vara: linha.replace(/\s+da\s+Comarca\s+de\s+.*$/i, '').trim(), comarca: comarcaRotulada };
};

const extrairObjeto = (texto: string): string | undefined => {
  const rotulado = texto.match(/\b(?:Objeto|Assunto)s?(?:\s+da\s+per[íi]cia)?\s*:\s*([^\n]+)/i)?.[1]?.trim();
  if (rotulado) return rotulado.slice(0, 500);
  const tipos = OBJETOS.filter(([regex]) => regex.test(texto)).map(([, nome]) => nome);
  return tipos.length ? `Perícia de ${tipos.join(' e ')}` : undefined;
};

const extrairNomeacao = (texto: string): string | undefined => {
  const frase = texto.match(/[^.\n]*\b(nomei|nomead|nomea[çc][ãa]o|design)[^.\n]*/i)?.[0] ?? '';
  const numerica = frase.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
  if (numerica) return parseData(numerica);
  const extenso = texto.match(/(\d{1,2})º?\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  const mes = extenso ? MESES.indexOf((extenso[2] ?? '').toLowerCase()) + 1 : 0;
  return extenso && mes ? parseData(`${extenso[1]}/${mes}/${extenso[3]}`) : undefined;
};

const extrairPrazo = (texto: string, nomeacao?: string): { prazoLaudo?: string; calculado: boolean } => {
  const frase = texto.match(/[^.]*\blaudo\b[^.]*/gi)?.find((f) => /prazo|at[ée]/i.test(f)) ?? '';
  const data = frase.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
  if (data) return { prazoLaudo: parseData(data), calculado: false };
  const dias = Number(frase.match(/prazo\s+de\s+(\d{1,3})/i)?.[1]);
  return dias && nomeacao ? { prazoLaudo: somarDias(nomeacao, dias), calculado: true } : { calculado: false };
};

// Função pura: texto da ata/despacho → rascunho do cadastro + o que faltou + avisos.
export const extrairAta = (texto: string): Omit<PdfExtraction, 'existingId'> => {
  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
  const warnings: ApiMessageKey[] = [];
  const numeros = [...new Set(texto.match(CNJ) ?? [])];
  if (numeros.length > 1) warnings.push('multiple_process_numbers');
  const numeroProcesso = numeros[0] ?? texto.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/)?.[0];
  if (numeroProcesso && !numeroProcessoSchema.safeParse(numeroProcesso).success) {
    warnings.push('invalid_process_number');
  }
  const dataNomeacao = extrairNomeacao(texto);
  const { prazoLaudo, calculado } = extrairPrazo(texto, dataNomeacao);
  if (calculado) warnings.push('deadline_calculated');
  const partes = extrairPartes(linhas);

  const draft: PdfDraft = {
    papel: 'court_expert',
    numeroProcesso,
    ...(numeroProcesso ? orgaoDoNumero(numeroProcesso) : {}),
    ...extrairVara(linhas, texto),
    objeto: extrairObjeto(texto),
    ...(partes.length ? { partes } : {}),
    dataNomeacao,
    prazoLaudo,
  };
  const esperados = [
    'numeroProcesso',
    'tribunal',
    'vara',
    'comarca',
    'objeto',
    'partes',
    'dataNomeacao',
    'prazoLaudo',
  ] as const;
  const clean = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined)) as PdfDraft;
  return { draft: clean, missing: esperados.filter((campo) => !clean[campo]), warnings };
};

export const extrairPdf = async (tenantId: string, arquivo: Buffer): Promise<PdfExtraction> => {
  if (!Buffer.isBuffer(arquivo) || arquivo.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new CustomError('unsupported_file_type', 415);
  }
  let texto: string;
  try {
    texto = (await extractText(new Uint8Array(arquivo), { mergePages: true })).text;
  } catch (error) {
    throw new CustomError('unsupported_file_type', 415, error instanceof Error ? error.message : undefined);
  }
  if (!texto.trim()) throw new CustomError('pdf_without_text', 422);

  const extraction = extrairAta(texto);
  const numero = extraction.draft.numeroProcesso;
  const existingId = numero ? await periciaRepository.findIdByNumero(tenantId, numero) : undefined;
  if (!existingId) return extraction;
  return { ...extraction, existingId, warnings: [...extraction.warnings, 'expert_case_already_registered'] };
};

// --- CSV (AD-115) ---------------------------------------------------------------
// `;` como separador, aspas duplas para campo com `;`/quebra de linha, BOM ignorado.
export const parseCsv = (texto: string): string[][] => {
  const registros: string[][] = [];
  let campo = '';
  let registro: string[] = [];
  let aspas = false;
  const fonte = texto.replace(/^﻿/, '');
  for (let i = 0; i < fonte.length; i++) {
    const c = fonte[i];
    if (aspas) {
      if (c === '"' && fonte[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') {
      registro.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && fonte[i + 1] === '\n') i++;
      registro.push(campo);
      registros.push(registro);
      registro = [];
      campo = '';
    } else campo += c;
  }
  if (campo || registro.length) registros.push([...registro, campo]);
  return registros;
};

type LinhaRecusada = { column?: CsvImportColumn; reason: ApiMessageKey };

const parseCentavos = (raw: string): number | undefined => {
  const limpo = raw.replace(/R\$|\s/g, '');
  const numero = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) : undefined;
};

const PAPEIS: Record<string, CreatePericia['papel']> = {
  '': 'court_expert',
  perito: 'court_expert',
  assistente: 'technical_assistant',
  'assistente técnico': 'technical_assistant',
  'assistente tecnico': 'technical_assistant',
};

const DATAS: [CsvImportColumn, keyof CreatePericia][] = [
  ['data_nomeacao', 'dataNomeacao'],
  ['prazo_laudo', 'prazoLaudo'],
  ['data_autuacao', 'dataAutuacao'],
  ['data_admissao', 'dataAdmissao'],
  ['data_demissao', 'dataDemissao'],
];

const TEXTOS: [CsvImportColumn, keyof CreatePericia][] = [
  ['vara', 'vara'],
  ['comarca', 'comarca'],
  ['objeto', 'objeto'],
  ['funcao_reclamante', 'funcaoReclamante'],
  ['local_pericia', 'localPericia'],
  ['observacoes', 'observacoes'],
];

const COLUNA_DO_CAMPO: Partial<Record<string, CsvImportColumn>> = Object.fromEntries([
  ['numeroProcesso', 'numero_processo'],
  ['honorariosPropostosCents', 'honorarios_propostos'],
  ...[...DATAS, ...TEXTOS].map(([coluna, campo]) => [campo, coluna]),
]);

// Uma linha do CSV → cadastro validado pelo mesmo schema do formulário, ou o motivo da recusa.
export const linhaParaPericia = (get: (coluna: CsvImportColumn) => string): { data: CreatePericia } | LinhaRecusada => {
  for (const coluna of CSV_IMPORT_REQUIRED_COLUMNS) {
    if (!get(coluna)) return { column: coluna, reason: 'missing_required_field' };
  }
  const numeroProcesso = get('numero_processo');
  if (!numeroProcessoSchema.safeParse(numeroProcesso).success) {
    return { column: 'numero_processo', reason: 'invalid_process_number' };
  }
  const orgao = orgaoDoNumero(numeroProcesso);
  if (!orgao) return { column: 'numero_processo', reason: 'unsupported_court' };
  const papel = PAPEIS[get('papel').toLowerCase()];
  if (!papel) return { column: 'papel', reason: 'invalid_field' };

  const data: Record<string, unknown> = { numeroProcesso, ...orgao, papel };
  for (const [coluna, campo] of TEXTOS) if (get(coluna)) data[campo] = get(coluna);
  for (const [coluna, campo] of DATAS) {
    if (!get(coluna)) continue;
    const dia = parseData(get(coluna));
    if (!dia) return { column: coluna, reason: 'invalid_date' };
    data[campo] = dia;
  }
  if (get('honorarios_propostos')) {
    const cents = parseCentavos(get('honorarios_propostos'));
    if (cents === undefined) return { column: 'honorarios_propostos', reason: 'invalid_field' };
    data.honorariosPropostosCents = cents;
  }

  const partes: PericiaParteInput[] = [];
  const polos: [Polo, 'autor' | 'reu'][] = [
    ['plaintiff', 'autor'],
    ['defendant', 'reu'],
  ];
  for (const [polo, prefixo] of polos) {
    const documento = documentoSchema.safeParse(get(`${prefixo}_documento`));
    if (!documento.success) return { column: `${prefixo}_documento`, reason: 'invalid_field' };
    const oab = oabSchema.safeParse(get(`${prefixo}_advogado_oab`));
    if (!oab.success) return { column: `${prefixo}_advogado_oab`, reason: 'invalid_field' };
    if (get(prefixo)) partes.push({ polo, tipo: 'party', nome: get(prefixo), documento: documento.data });
    if (get(`${prefixo}_advogado`)) {
      partes.push({ polo, tipo: 'lawyer', nome: get(`${prefixo}_advogado`), oab: oab.data });
    }
  }
  if (partes.length) data.partes = partes;

  const parsed = createPericiaSchema.safeParse(data);
  if (!parsed.success) {
    const campo = String(parsed.error.issues[0]?.path[0] ?? '');
    return { column: COLUNA_DO_CAMPO[campo], reason: 'invalid_field' };
  }
  return { data: parsed.data };
};

// Importa as linhas válidas uma a uma pelo mesmo caminho do formulário e devolve o relatório
// por linha (a linha 1 é o cabeçalho). Número já cadastrado é ignorado sem parar o lote.
export const importarCsv = async (tenantId: string, texto: string): Promise<CsvImportResult> => {
  const [cabecalho, ...registros] = parseCsv(typeof texto === 'string' ? texto : '');
  const linhas = registros
    .map((campos, index) => ({ campos, line: index + 2 }))
    .filter(({ campos }) => campos.some((campo) => campo.trim()));
  if (!cabecalho || !linhas.length) throw new CustomError('csv_empty', 400);
  if (linhas.length > CSV_IMPORT_MAX_ROWS) throw new CustomError('csv_too_many_rows', 400);
  const colunas = cabecalho.map((nome) => nome.trim().toLowerCase());
  const faltando = CSV_IMPORT_REQUIRED_COLUMNS.filter((coluna) => !colunas.includes(coluna));
  if (faltando.length) throw new CustomError('csv_invalid_header', 400, faltando.join(', '));
  const posicao = new Map(
    CSV_IMPORT_COLUMNS.map((coluna) => [coluna, colunas.indexOf(coluna)] as const).filter(([, i]) => i >= 0),
  );

  const result: CsvImportResult = { created: 0, skipped: [], rejected: [] };
  for (const { campos, line } of linhas) {
    const get = (coluna: CsvImportColumn) => {
      const i = posicao.get(coluna);
      return i === undefined ? '' : (campos[i] ?? '').trim();
    };
    const linha = linhaParaPericia(get);
    if (!('data' in linha)) {
      result.rejected.push({ line, ...linha });
      continue;
    }
    try {
      await periciaService.createPericia({ ...linha.data, tenant: tenantId });
      result.created++;
    } catch (error) {
      if (error instanceof CustomError && error.message === 'expert_case_already_registered') {
        result.skipped.push({ line, numeroProcesso: linha.data.numeroProcesso });
      } else if (error instanceof CustomError && error.status < 500) {
        result.rejected.push({ line, reason: error.message });
      } else {
        throw error;
      }
    }
  }
  return result;
};
