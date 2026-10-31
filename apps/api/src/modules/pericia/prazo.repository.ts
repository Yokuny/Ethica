import type { PrazoDocument } from '@ethica/db';
import { Prazo, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CreatePrazo, PrazoDoAviso, PrazoRecord, PrazoWrite, ProximoPrazo } from './prazo.schema.js';

const toRecord = (doc: PrazoDocument): PrazoRecord => ({
  id: doc._id.toString(),
  periciaId: doc.Pericia.toString(),
  titulo: doc.titulo,
  vencimento: doc.vencimento,
  status: doc.status,
  protocoladoEm: doc.protocoladoEm,
  observacoes: doc.observacoes,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createPrazo = async (tenantId: string, periciaId: string, data: CreatePrazo): Promise<PrazoRecord> =>
  withDbTiming('prazo.createPrazo', async () => {
    const doc = await Prazo.create({ ...data, Tenant: tenantId, Pericia: periciaId });
    return toRecord(doc);
  });

// Só os campos informados entram no $set; `protocoladoEm: null` vira $unset.
export const updatePrazo = async (tenantId: string, id: string, data: PrazoWrite): Promise<PrazoRecord | null> =>
  withDbTiming('prazo.updatePrazo', async () => {
    const { protocoladoEm, ...rest } = data;
    const $set: Record<string, unknown> = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );
    if (protocoladoEm) $set.protocoladoEm = protocoladoEm;
    const doc = await Prazo.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set, ...(protocoladoEm === null ? { $unset: { protocoladoEm: 1 } } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deletePrazo = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('prazo.deletePrazo', async () => {
    const result = await Prazo.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

export const deleteByPericia = async (tenantId: string, periciaId: string): Promise<void> =>
  withDbTiming('prazo.deleteByPericia', async () => {
    await Prazo.deleteMany(tenantScoped({ Tenant: tenantId, Pericia: periciaId }));
  });

export const listByPericia = async (tenantId: string, periciaId: string): Promise<PrazoRecord[]> =>
  withDbTiming('prazo.listByPericia', async () => {
    const docs = await Prazo.find(tenantScoped({ Tenant: tenantId, Pericia: periciaId }))
      .sort({ vencimento: 1, _id: 1 })
      .lean();
    return docs.map(toRecord);
  });

export const listPendentes = async (tenantId: string, range: { from?: string; to?: string }): Promise<PrazoRecord[]> =>
  withDbTiming('prazo.listPendentes', async () => {
    const vencimento = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lt: range.to } : {}) };
    const docs = await Prazo.find(
      tenantScoped({
        Tenant: tenantId,
        status: 'pending' as const,
        ...(Object.keys(vencimento).length ? { vencimento } : {}),
      }),
    )
      .sort({ vencimento: 1, _id: 1 })
      .limit(500)
      .lean();
    return docs.map(toRecord);
  });

// Consulta do sistema (aviso diário): de propósito sem filtro de Tenant — cada
// item volta com o seu, e o service separa por tenant antes de enviar.
export const listPendentesNosDias = async (dias: string[]): Promise<PrazoDoAviso[]> =>
  withDbTiming('prazo.listPendentesNosDias', async () => {
    const docs = await Prazo.find({ status: 'pending', vencimento: { $in: dias } })
      .sort({ vencimento: 1, _id: 1 })
      .lean();
    return docs.map((doc) => ({ ...toRecord(doc), tenantId: doc.Tenant.toString() }));
  });

// Listagem de perícias: o prazo pendente mais próximo de cada uma, numa agregação só.
export const proximosByPericiaIds = async (tenantId: string, ids: string[]): Promise<Map<string, ProximoPrazo>> =>
  withDbTiming('prazo.proximosByPericiaIds', async () => {
    if (ids.length === 0) return new Map();
    const rows = await Prazo.aggregate<{ _id: unknown; titulo: string; vencimento: string }>([
      { $match: { Tenant: toObjectId(tenantId), status: 'pending', Pericia: { $in: ids.map(toObjectId) } } },
      { $sort: { vencimento: 1, _id: 1 } },
      { $group: { _id: '$Pericia', titulo: { $first: '$titulo' }, vencimento: { $first: '$vencimento' } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), { titulo: row.titulo, vencimento: row.vencimento }]));
  });
