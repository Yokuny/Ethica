import type { LaudoTipo } from '@ethica/contracts';
import type { ModeloLaudoDocument, ModeloLaudoSecaoDocument } from '@ethica/db';
import { ModeloLaudo, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { ModeloLaudoRecord, ModeloLaudoResumo, ModeloSecao, ModeloSecaoRecord } from './laudo.schema.js';

const secaoToRecord = (secao: ModeloLaudoSecaoDocument): ModeloSecaoRecord => ({
  id: secao._id.toString(),
  titulo: secao.titulo,
  nivel: secao.nivel,
  apenasTitulo: secao.apenasTitulo,
  quebraPagina: secao.quebraPagina,
  textoSim: secao.textoSim,
  textoNao: secao.textoNao,
});

const toRecord = (doc: ModeloLaudoDocument): ModeloLaudoRecord => ({
  id: doc._id.toString(),
  nome: doc.nome,
  tipo: doc.tipo,
  padrao: false,
  secoes: doc.secoes.map(secaoToRecord),
  updatedAt: doc.updatedAt,
});

export const list = async (tenantId: string, tipo?: LaudoTipo): Promise<ModeloLaudoResumo[]> =>
  withDbTiming('modeloLaudo.list', async () => {
    const rows = await ModeloLaudo.aggregate<{
      _id: unknown;
      nome: string;
      tipo: LaudoTipo;
      totalSecoes: number;
      updatedAt: Date;
    }>([
      { $match: { Tenant: toObjectId(tenantId), ...(tipo ? { tipo } : {}) } },
      { $sort: { nome: 1, _id: 1 } },
      { $project: { nome: 1, tipo: 1, updatedAt: 1, totalSecoes: { $size: '$secoes' } } },
    ]);
    return rows.map(({ _id, ...row }) => ({ ...row, id: String(_id), padrao: false }));
  });

export const findById = async (tenantId: string, id: string): Promise<ModeloLaudoRecord | null> =>
  withDbTiming('modeloLaudo.findById', async () => {
    const doc = await ModeloLaudo.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const create = async (
  tenantId: string,
  data: { nome: string; tipo: LaudoTipo; secoes: ModeloSecao[] },
): Promise<ModeloLaudoRecord> =>
  withDbTiming('modeloLaudo.create', async () => toRecord(await ModeloLaudo.create({ ...data, Tenant: tenantId })));

export const updateNome = async (tenantId: string, id: string, nome: string): Promise<ModeloLaudoRecord | null> =>
  withDbTiming('modeloLaudo.updateNome', async () => {
    const doc = await ModeloLaudo.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set: { nome } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const remove = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('modeloLaudo.remove', async () => {
    const result = await ModeloLaudo.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const addSecao = async (tenantId: string, id: string, secao: ModeloSecao): Promise<ModeloLaudoRecord | null> =>
  withDbTiming('modeloLaudo.addSecao', async () => {
    const doc = await ModeloLaudo.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $push: { secoes: secao } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const updateSecao = async (
  tenantId: string,
  id: string,
  secaoId: string,
  secao: ModeloSecao,
): Promise<ModeloLaudoRecord | null> =>
  withDbTiming('modeloLaudo.updateSecao', async () => {
    const $set = Object.fromEntries(Object.entries(secao).map(([field, valor]) => [`secoes.$.${field}`, valor]));
    const doc = await ModeloLaudo.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, 'secoes._id': toObjectId(secaoId) }),
      { $set },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const removeSecao = async (tenantId: string, id: string, secaoId: string): Promise<ModeloLaudoRecord | null> =>
  withDbTiming('modeloLaudo.removeSecao', async () => {
    const doc = await ModeloLaudo.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id, 'secoes._id': toObjectId(secaoId) }),
      { $pull: { secoes: { _id: toObjectId(secaoId) } } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Reordenar: grava a lista inteira na ordem nova, mantendo os ids das seções.
export const setSecoes = async (
  tenantId: string,
  id: string,
  secoes: ModeloSecaoRecord[],
): Promise<ModeloLaudoRecord | null> =>
  withDbTiming('modeloLaudo.setSecoes', async () => {
    const doc = await ModeloLaudo.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set: { secoes: secoes.map(({ id: secaoId, ...secao }) => ({ ...secao, _id: toObjectId(secaoId) })) } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });
