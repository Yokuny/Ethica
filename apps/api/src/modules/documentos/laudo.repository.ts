import type { LaudoDocument, LaudoSecaoDocument } from '@ethica/db';
import { Laudo, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import { pendenciasDe } from './laudo.html.js';
import type {
  LaudoCreateInput,
  LaudoListItem,
  LaudoRecord,
  LaudoSecaoRecord,
  ListLaudosQuery,
  UpdateLaudoSecao,
} from './laudo.schema.js';

const secaoToRecord = (secao: LaudoSecaoDocument): LaudoSecaoRecord => ({
  id: secao._id.toString(),
  titulo: secao.titulo,
  nivel: secao.nivel,
  apenasTitulo: secao.apenasTitulo,
  quebraPagina: secao.quebraPagina,
  variante: secao.variante,
  html: secao.html,
});

const toRecord = (doc: LaudoDocument): LaudoRecord => {
  const secoes = doc.secoes.map(secaoToRecord);
  return {
    id: doc._id.toString(),
    caseId: doc.Case.toString(),
    tipo: doc.tipo,
    status: doc.status,
    titulo: doc.titulo,
    modeloNome: doc.modeloNome,
    secoes,
    pendencias: pendenciasDe(secoes),
    concluidoEm: doc.concluidoEm,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const create = async (input: LaudoCreateInput): Promise<LaudoRecord> =>
  withDbTiming('laudo.create', async () => {
    const { tenantId, caseId, userId, ...rest } = input;
    return toRecord(await Laudo.create({ ...rest, Tenant: tenantId, Case: caseId, CriadoPor: userId }));
  });

export const findById = async (tenantId: string, id: string): Promise<LaudoRecord | null> =>
  withDbTiming('laudo.findById', async () => {
    const doc = await Laudo.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const list = async (
  tenantId: string,
  query: ListLaudosQuery,
): Promise<{ items: LaudoListItem[]; total: number }> =>
  withDbTiming('laudo.list', async () => {
    const match = {
      Tenant: toObjectId(tenantId),
      ...(query.status ? { status: query.status } : {}),
      ...(query.caseId ? { Case: toObjectId(query.caseId) } : {}),
    };
    const [result] = await Laudo.aggregate<{
      items: Array<LaudoDocument & { totalSecoes: number }>;
      total: { n: number }[];
    }>([
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: { updatedAt: -1, _id: 1 } },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
            { $addFields: { totalSecoes: { $size: '$secoes' } } },
            { $project: { secoes: 0 } },
          ],
          total: [{ $count: 'n' }],
        },
      },
    ]);
    return {
      items: (result?.items ?? []).map((doc) => ({
        id: String(doc._id),
        caseId: String(doc.Case),
        tipo: doc.tipo,
        status: doc.status,
        titulo: doc.titulo,
        modeloNome: doc.modeloNome,
        totalSecoes: doc.totalSecoes,
        concluidoEm: doc.concluidoEm,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total: result?.total[0]?.n ?? 0,
    };
  });

// Escritas só valem em rascunho: o filtro por `status: 'draft'` é o bloqueio no servidor (AD-126).
const rascunho = (tenantId: string, id: string, extra: Record<string, unknown> = {}) =>
  tenantScoped({ Tenant: tenantId, _id: id, status: 'draft' as const, ...extra });

export const updateSecao = async (
  tenantId: string,
  id: string,
  secaoId: string,
  data: UpdateLaudoSecao,
): Promise<LaudoRecord | null> =>
  withDbTiming('laudo.updateSecao', async () => {
    const $set = Object.fromEntries(
      Object.entries(data)
        .filter(([, valor]) => valor !== undefined)
        .map(([campo, valor]) => [`secoes.$.${campo}`, valor]),
    );
    const doc = await Laudo.findOneAndUpdate(
      rascunho(tenantId, id, { 'secoes._id': toObjectId(secaoId) }),
      { $set },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const removeSecao = async (tenantId: string, id: string, secaoId: string): Promise<LaudoRecord | null> =>
  withDbTiming('laudo.removeSecao', async () => {
    const doc = await Laudo.findOneAndUpdate(
      rascunho(tenantId, id, { 'secoes._id': toObjectId(secaoId), 'secoes.1': { $exists: true } }),
      { $pull: { secoes: { _id: toObjectId(secaoId) } } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Grava o texto final, já com as variáveis resolvidas de novo, junto com o status.
export const concluir = async (
  tenantId: string,
  id: string,
  userId: string,
  now: Date,
  secoes: LaudoSecaoRecord[],
): Promise<LaudoRecord | null> =>
  withDbTiming('laudo.concluir', async () => {
    const doc = await Laudo.findOneAndUpdate(
      rascunho(tenantId, id),
      {
        $set: {
          status: 'completed',
          concluidoEm: now,
          ConcluidoPor: userId,
          secoes: secoes.map(({ id: secaoId, ...secao }) => ({ ...secao, _id: toObjectId(secaoId) })),
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const removeRascunho = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('laudo.removeRascunho', async () => {
    const result = await Laudo.deleteOne(rascunho(tenantId, id));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const deleteByCase = async (tenantId: string, caseId: string): Promise<void> =>
  withDbTiming('laudo.deleteByCase', async () => {
    await Laudo.deleteMany(tenantScoped({ Tenant: tenantId, Case: caseId }));
  });
