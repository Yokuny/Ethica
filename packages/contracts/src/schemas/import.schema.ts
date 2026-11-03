// Case import (AD-115, AD-118). Any spreadsheet is accepted (RSV-04): each column is matched to a case
// field by its name; what has no field goes to the notes. The template is only an example.
export const CSV_IMPORT_FIELDS = [
  'serviceType',
  'role',
  'processNumber',
  'court',
  'division',
  'district',
  'subject',
  'status',
  'nominationDate',
  'reportDeadline',
  'proposedFees',
  'plaintiff',
  'plaintiffDocument',
  'plaintiffLawyer',
  'plaintiffLawyerOab',
  'defendant',
  'defendantDocument',
  'defendantLawyer',
  'defendantLawyerOab',
  'docketingDate',
  'hireDate',
  'terminationDate',
  'claimantJob',
  'location',
  'notes',
  'ignore',
] as const;
export type CsvImportField = (typeof CSV_IMPORT_FIELDS)[number];

// Header without case, accents and punctuation: "Nº do Processo" → "n do processo".
export const csvHeaderKey = (header: string): string =>
  header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const PLAINTIFF = ['autor', 'autora', 'reclamante', 'requerente', 'exequente', 'polo ativo'];
const DEFENDANT = ['reu', 're', 'reclamada', 'reclamado', 'requerido', 'requerida', 'executado', 'polo passivo'];
const sideNames = (prefixes: string[], sides: string[]) =>
  prefixes.flatMap((prefix) =>
    sides.flatMap((side) => [`${prefix} ${side}`, `${prefix} do ${side}`, `${prefix} da ${side}`, `${side} ${prefix}`]),
  );

// Names (already as `csvHeaderKey`) of each field. `notes` and `ignore` are not guessed from the name
// except for the notes column itself.
const SYNONYMS: Record<Exclude<CsvImportField, 'ignore'>, string[]> = {
  serviceType: ['tipo', 'tipo de servico', 'tipo servico', 'servico', 'natureza', 'especialidade', 'tipo de pericia'],
  role: ['papel', 'atuacao', 'funcao no processo', 'qualidade'],
  processNumber: [
    'processo',
    'numero do processo',
    'numero processo',
    'n processo',
    'n do processo',
    'no processo',
    'num processo',
    'autos',
    'cnj',
    'numero processo cnj',
  ],
  court: ['tribunal', 'trt', 'tj', 'trf', 'orgao'],
  division: ['vara', 'juizo', 'orgao julgador', 'unidade', 'vara do trabalho'],
  district: ['comarca', 'cidade', 'municipio', 'foro', 'localidade'],
  subject: ['objeto', 'assunto', 'materia', 'objeto da pericia', 'descricao', 'tipo de pericia objeto'],
  status: ['status', 'situacao', 'etapa', 'fase', 'andamento'],
  nominationDate: ['data nomeacao', 'data da nomeacao', 'nomeacao', 'nomeado em', 'data de nomeacao'],
  reportDeadline: ['prazo', 'prazo laudo', 'prazo do laudo', 'entrega do laudo', 'prazo de entrega', 'vencimento'],
  proposedFees: [
    'honorario',
    'honorarios',
    'valor',
    'valor honorarios',
    'valor dos honorarios',
    'honorarios propostos',
    'proposta',
    'valor da proposta',
  ],
  plaintiff: PLAINTIFF,
  plaintiffDocument: sideNames(['cpf', 'cnpj', 'documento', 'cpf cnpj'], PLAINTIFF),
  plaintiffLawyer: sideNames(['advogado', 'advogada'], PLAINTIFF),
  plaintiffLawyerOab: sideNames(['oab', 'oab advogado'], PLAINTIFF),
  defendant: DEFENDANT,
  defendantDocument: sideNames(['cpf', 'cnpj', 'documento', 'cpf cnpj'], DEFENDANT),
  defendantLawyer: sideNames(['advogado', 'advogada'], DEFENDANT),
  defendantLawyerOab: sideNames(['oab', 'oab advogado'], DEFENDANT),
  docketingDate: ['autuacao', 'data autuacao', 'data da autuacao', 'distribuicao', 'data de distribuicao'],
  hireDate: ['admissao', 'data admissao', 'data de admissao'],
  terminationDate: ['demissao', 'data demissao', 'data de demissao', 'desligamento'],
  claimantJob: ['funcao', 'cargo', 'funcao reclamante', 'funcao do reclamante'],
  location: ['local', 'endereco', 'local pericia', 'local da pericia', 'endereco da pericia'],
  notes: ['observacoes', 'observacao', 'obs', 'anotacoes', 'comentarios'],
};

// Field suggested for a column: same name as a synonym is certain; a name that contains one (the longest
// wins: "cpf do autor" before "autor") is a guess flagged with "!"; nothing found goes to the notes.
export const suggestCsvField = (header: string): { field: CsvImportField; certain: boolean } => {
  const key = csvHeaderKey(header);
  let guess: { field: CsvImportField; length: number } | undefined;
  for (const [field, names] of Object.entries(SYNONYMS) as [CsvImportField, string[]][]) {
    for (const name of names) {
      if (key === name) return { field, certain: true };
      if (` ${key} `.includes(` ${name} `) && name.length > (guess?.length ?? 0))
        guess = { field, length: name.length };
    }
  }
  return guess ? { field: guess.field, certain: false } : { field: 'notes', certain: false };
};

// Example spreadsheet offered for download: pt-BR headers that are all recognized.
export const CSV_IMPORT_EXAMPLE: Record<string, string> = {
  'Tipo de serviço': 'Perícia trabalhista',
  'Número do processo': '0001234-56.2026.5.02.0001',
  Vara: '1ª Vara do Trabalho',
  Comarca: 'São Paulo',
  Objeto: 'Perícia de insalubridade',
  Status: 'Nomeado',
  'Data da nomeação': '15/10/2026',
  'Prazo do laudo': '30/11/2026',
  Honorários: '3.500,00',
  Reclamante: 'Maria da Silva',
  'CPF do reclamante': '123.456.789-09',
  'Advogado do reclamante': 'João Pereira',
  'OAB do reclamante': 'SP123456',
  Reclamada: 'Indústria Exemplo Ltda.',
  'CNPJ da reclamada': '12.345.678/0001-95',
  'Advogado da reclamada': 'Ana Souza',
  'OAB da reclamada': 'SP654321',
  Observações: '',
};

export const CSV_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_IMPORT_MAX_ROWS = 1000;
// Large enough for the full process downloaded from the PJe, not only the minutes.
export const PDF_IMPORT_MAX_BYTES = 50 * 1024 * 1024;
