import { z } from 'zod';
import { idSchema } from './id.schema.js';
import type { PapelPericia } from './pericia.schema.js';

// Laudo pericial (perito do juízo) ou parecer técnico (assistente técnico, LAU-06).
export const LAUDO_TIPOS = ['report', 'technical_opinion'] as const;
export type LaudoTipo = (typeof LAUDO_TIPOS)[number];

export const laudoTipoDoPapel = (papel: PapelPericia): LaudoTipo =>
  papel === 'technical_assistant' ? 'technical_opinion' : 'report';

// Rascunho editável → concluído, só leitura no servidor (AD-126).
export const LAUDO_STATUS = ['draft', 'completed'] as const;
export type LaudoStatus = (typeof LAUDO_STATUS)[number];

// Texto "sim" (presente/positivo) ou "não" (ausente/negativo) de cada seção.
export const LAUDO_VARIANTES = ['yes', 'no'] as const;
export type LaudoVariante = (typeof LAUDO_VARIANTES)[number];

// Modelos padrão vivem no código da API e valem para todo tenant (AD-126); o id é fixo.
export const LAUDO_MODELOS_PADRAO = {
  report: 'standard-report',
  technical_opinion: 'standard-technical_opinion',
} as const satisfies Record<LaudoTipo, string>;
export const isModeloPadrao = (id: string): boolean => Object.values<string>(LAUDO_MODELOS_PADRAO).includes(id);

// Marcadores trocados pelos dados da perícia, do perito e do escritório (AD-126).
export const LAUDO_VARIAVEIS = [
  '[NUMERO_PROCESSO]',
  '[TRIBUNAL]',
  '[VARA]',
  '[COMARCA]',
  '[JUSTICA]',
  '[OBJETO]',
  '[NOME_AUTOR]',
  '[NOME_REU]',
  '[DENOMINACAO_AUTOR]',
  '[DENOMINACAO_REU]',
  '[ADVOGADOS_AUTOR]',
  '[ADVOGADOS_REU]',
  '[DATA_NOMEACAO]',
  '[DATA_VISTORIA]',
  '[LOCAL_PERICIA]',
  '[FUNCAO_RECLAMANTE]',
  '[DATA_ADMISSAO]',
  '[DATA_DEMISSAO]',
  '[PERIODO_IMPRESCRITO]',
  '[DATA_EXTENSO]',
  '[PERITO_NOME]',
  '[PERITO_REGISTRO]',
  '[PERITO_FORMACAO]',
  '[ESCRITORIO_NOME]',
  // Da última vistoria feita da perícia (AD-130).
  '[HORA_VISTORIA]',
  '[PRESENTES_VISTORIA]',
  '[PARADIGMAS_AUTOR]',
  '[PARADIGMAS_REU]',
  '[FUNCOES_AUTOR]',
  '[FUNCOES_REU]',
  '[AGENTES_PRESENTES]',
  '[AGENTES_AUSENTES]',
  '[DOCUMENTOS_SOLICITADOS]',
] as const;
export type LaudoVariavel = (typeof LAUDO_VARIAVEIS)[number];

// Marcadores da lista ainda presentes no texto (sem valor na resolução).
export const variaveisPendentes = (html: string): LaudoVariavel[] =>
  LAUDO_VARIAVEIS.filter((variavel) => html.includes(variavel));

// Única allowlist do HTML do laudo (AD-123): o editor só produz isto, a API saneia para isto
// e o PDF e o Word sabem desenhar cada uma destas tags.
export const LAUDO_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
] as const;

// Única imagem aceita no laudo (AD-129): foto de vistoria do próprio tenant, servida pela API.
export const LAUDO_IMG_SRC = /^\/vistorias\/[0-9a-f]{24}\/midias\/[0-9a-f-]{36}$/i;

export const LAUDO_NIVEL_MAX = 3;

// Número de cada seção ("1", "1.1", "2") pela posição e pelo nível; nunca gravado (AD-126).
// Um nível que salta (1 → 3) conta como o seguinte do anterior.
export const numerarSecoes = (secoes: ReadonlyArray<{ nivel: number }>): string[] => {
  const contadores: number[] = [];
  return secoes.map(({ nivel }) => {
    const alvo = Math.min(Math.max(nivel, 1), contadores.length + 1);
    contadores.length = alvo;
    contadores[alvo - 1] = (contadores[alvo - 1] ?? 0) + 1;
    return contadores.join('.');
  });
};

const LAUDO_HTML_MAX = 200_000;
export const LAUDO_SECOES_MAX = 200;

const tituloSchema = z.string().trim().min(1, 'título é obrigatório').max(200, 'título muito longo');
const htmlSchema = z.string().max(LAUDO_HTML_MAX, 'texto muito longo');
const modeloIdSchema = z.union([
  idSchema,
  z.enum([LAUDO_MODELOS_PADRAO.report, LAUDO_MODELOS_PADRAO.technical_opinion]),
]);

export const createModeloLaudoSchema = z
  .object({
    nome: z.string().trim().min(1, 'nome é obrigatório').max(120, 'nome muito longo'),
    tipo: z.enum(LAUDO_TIPOS),
    // Sem base, o modelo nasce em branco; com base, clona as seções (padrão ou do escritório).
    baseId: modeloIdSchema.optional(),
  })
  .strict();
export type CreateModeloLaudo = z.infer<typeof createModeloLaudoSchema>;

export const updateModeloLaudoSchema = createModeloLaudoSchema.pick({ nome: true }).strict();
export type UpdateModeloLaudo = z.infer<typeof updateModeloLaudoSchema>;

export const modeloSecaoSchema = z
  .object({
    titulo: tituloSchema,
    nivel: z.number().int().min(1).max(LAUDO_NIVEL_MAX),
    apenasTitulo: z.boolean(),
    quebraPagina: z.boolean(),
    textoSim: htmlSchema,
    textoNao: htmlSchema,
  })
  .strict();
export type ModeloSecao = z.infer<typeof modeloSecaoSchema>;

export const moverSecaoSchema = z.object({ direcao: z.enum(['up', 'down']) }).strict();
export type MoverSecao = z.infer<typeof moverSecaoSchema>;

export const createLaudoSchema = z
  .object({
    periciaId: idSchema,
    modeloId: modeloIdSchema,
    secoes: z
      .array(z.object({ id: z.string().min(1).max(40), variante: z.enum(LAUDO_VARIANTES) }).strict())
      .min(1, 'escolha ao menos uma seção')
      .max(LAUDO_SECOES_MAX),
  })
  .strict();
export type CreateLaudo = z.infer<typeof createLaudoSchema>;

export const updateLaudoSecaoSchema = z
  .object({ titulo: tituloSchema.optional(), html: htmlSchema.optional() })
  .strict();
export type UpdateLaudoSecao = z.infer<typeof updateLaudoSecaoSchema>;

// Registrar a entrega: protocola o prazo "Entrega do laudo", lança a movimentação `report_filed`
// e avança a etapa para `report_delivered` (AD-126).
export const concluirLaudoSchema = z.object({ registrarEntrega: z.boolean() }).strict();
export type ConcluirLaudo = z.infer<typeof concluirLaudoSchema>;
