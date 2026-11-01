import { z } from 'zod';
import { POLOS } from './parte.schema.js';

// Registro da vistoria (AD-130): um só tipo para o formulário de campo e para as variáveis do
// laudo, para que o que é gravado seja exatamente o que o laudo lê.

// Agentes do mapeamento de campo, os mesmos do checklist em PDF (DOC-02).
export const VISTORIA_AGENTES = [
  'noise',
  'heat',
  'cold',
  'humidity',
  'chemicals',
  'biological_agents',
  'hazardous',
] as const;
export type VistoriaAgente = (typeof VISTORIA_AGENTES)[number];

// Documentos pedidos às partes; além destes, o perito escreve o que precisar.
export const VISTORIA_DOCUMENTOS = ['risk_program', 'ltcat', 'pcmso', 'ppe_records', 'ppp', 'job_description'] as const;

export const VISTORIA_QUALIDADES = [
  'plaintiff',
  'defendant',
  'plaintiff_lawyer',
  'defendant_lawyer',
  'technical_assistant',
  'witness',
  'other',
] as const;
export type VistoriaQualidade = (typeof VISTORIA_QUALIDADES)[number];

export const MIDIA_TIPOS = ['photo', 'audio', 'signature'] as const;
export type MidiaTipo = (typeof MIDIA_TIPOS)[number];

// Limites por tipo de mídia (AD-129); tudo conta na cota do escritório (AD-120).
export const VISTORIA_MIDIA_LIMITES: Record<MidiaTipo, { maxBytes: number; maxPorVistoria: number; mimes: string[] }> =
  {
    photo: { maxBytes: 2 * 1024 * 1024, maxPorVistoria: 30, mimes: ['image/jpeg'] },
    audio: { maxBytes: 20 * 1024 * 1024, maxPorVistoria: 10, mimes: ['audio/webm', 'audio/mp4'] },
    signature: { maxBytes: 200 * 1024, maxPorVistoria: 30, mimes: ['image/png'] },
  };

// Mídia tem id gerado no aparelho (AD-128): reenviar a mesma não duplica.
export const midiaIdSchema = z.uuid('id de mídia inválido');

const curto = z.string().trim().max(200, 'texto muito longo');
const longo = z.string().trim().max(2000, 'texto muito longo');
const itemId = z.string().min(1).max(40);
const ano = z.number().int().min(1900).max(2100);
const lista = <T extends z.ZodType>(item: T) => z.array(item).max(30, 'itens demais');

const versaoFuncaoSchema = z
  .object({ atividades: longo.optional(), frequencia: curto.optional(), tempoExposicao: curto.optional() })
  .strict();

export const vistoriaDadosSchema = z
  .object({
    presentes: lista(
      z
        .object({
          id: itemId,
          nome: curto.min(1, 'nome é obrigatório'),
          qualidade: z.enum(VISTORIA_QUALIDADES),
          email: z.email('e-mail inválido').optional(),
          assinaturaId: midiaIdSchema.optional(),
        })
        .strict(),
    ),
    paradigmas: lista(
      z
        .object({
          id: itemId,
          polo: z.enum(POLOS),
          nome: curto.min(1, 'nome é obrigatório'),
          funcao: curto.optional(),
          periodo: curto.optional(),
          trabalhouJunto: z.boolean().optional(),
        })
        .strict(),
    ),
    funcoes: lista(
      z
        .object({
          id: itemId,
          titulo: curto.min(1, 'função é obrigatória'),
          anoInicio: ano.optional(),
          anoFim: ano.optional(),
          local: curto.optional(),
          autor: versaoFuncaoSchema,
          reu: versaoFuncaoSchema,
        })
        .strict(),
    ),
    agentes: lista(
      z
        .object({
          agente: z.enum(VISTORIA_AGENTES),
          presente: z.enum(['yes', 'no']),
          epi: curto.optional(),
          observacoes: curto.optional(),
        })
        .strict(),
    ),
    documentos: lista(
      z
        .object({ id: itemId, documento: curto.min(1), solicitado: z.boolean(), observacoes: curto.optional() })
        .strict(),
    ),
    // Internas: nunca vão ao laudo.
    observacoes: z.string().trim().max(10_000, 'observações muito longas').optional(),
  })
  .strict();
export type VistoriaDados = z.infer<typeof vistoriaDadosSchema>;

export const VISTORIA_DADOS_VAZIOS: VistoriaDados = {
  presentes: [],
  paradigmas: [],
  funcoes: [],
  agentes: [],
  documentos: [],
};

// Salvar o formulário inteiro com a versão que o aparelho conhecia (AD-128).
export const saveVistoriaSchema = z.object({ versao: z.number().int().min(0), dados: vistoriaDadosSchema }).strict();
export type SaveVistoria = z.infer<typeof saveVistoriaSchema>;

export const updateMidiaSchema = z.object({ legenda: curto }).strict();
export type UpdateMidia = z.infer<typeof updateMidiaSchema>;
