// Importação de perícias (AD-115, AD-118). As colunas do CSV são a fonte única do
// modelo que o web oferece para download e do parser da API.
export const CSV_IMPORT_COLUMNS = [
  'numero_processo',
  'papel',
  'vara',
  'comarca',
  'objeto',
  'data_nomeacao',
  'prazo_laudo',
  'honorarios_propostos',
  'autor',
  'autor_documento',
  'autor_advogado',
  'autor_advogado_oab',
  'reu',
  'reu_documento',
  'reu_advogado',
  'reu_advogado_oab',
  'data_autuacao',
  'data_admissao',
  'data_demissao',
  'funcao_reclamante',
  'local_pericia',
  'observacoes',
] as const;
export type CsvImportColumn = (typeof CSV_IMPORT_COLUMNS)[number];

export const CSV_IMPORT_REQUIRED_COLUMNS: readonly CsvImportColumn[] = ['numero_processo', 'objeto'];

// Linha de exemplo do modelo, na ordem de `CSV_IMPORT_COLUMNS`.
export const CSV_IMPORT_EXAMPLE: Record<CsvImportColumn, string> = {
  numero_processo: '0001234-56.2026.5.02.0001',
  papel: 'expert',
  vara: '1ª Vara do Trabalho',
  comarca: 'São Paulo',
  objeto: 'Perícia de insalubridade',
  data_nomeacao: '15/10/2026',
  prazo_laudo: '30/11/2026',
  honorarios_propostos: '3.500,00',
  autor: 'Maria da Silva',
  autor_documento: '123.456.789-09',
  autor_advogado: 'João Pereira',
  autor_advogado_oab: 'SP123456',
  reu: 'Indústria Exemplo Ltda.',
  reu_documento: '12.345.678/0001-95',
  reu_advogado: 'Ana Souza',
  reu_advogado_oab: 'SP654321',
  data_autuacao: '10/03/2026',
  data_admissao: '01/02/2018',
  data_demissao: '20/12/2025',
  funcao_reclamante: 'Operadora de máquinas',
  local_pericia: 'Rua das Indústrias, 100, São Paulo/SP',
  observacoes: '',
};

export const CSV_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_IMPORT_MAX_ROWS = 1000;
export const PDF_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
