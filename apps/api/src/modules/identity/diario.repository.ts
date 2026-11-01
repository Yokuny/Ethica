import { Atividade, type AtividadeDocument, tenantScoped, toObjectId, User } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { AtividadeRecord, ListDiarioQuery, NovaAtividade } from './diario.schema.js';

const toRecord = (doc: AtividadeDocument): AtividadeRecord => ({
  id: doc._id.toString(),
  userId: doc.User.toString(),
  userName: doc.userName,
  modulo: doc.modulo,
  recurso: doc.recurso,
  acao: doc.acao,
  registroId: doc.registroId,
  rotulo: doc.rotulo,
  createdAt: doc.createdAt,
});

export const registrar = async ({ tenantId, userId, ...data }: NovaAtividade): Promise<void> =>
  withDbTiming('diario.registrar', async () => {
    const user = await User.findOne(tenantScoped({ Tenant: tenantId, _id: userId }))
      .select('name')
      .lean();
    if (!user) return;
    await Atividade.create({ ...data, Tenant: tenantId, User: userId, userName: user.name });
  });

// Período em dias de calendário no fuso de exibição: limites como instantes (AD-036/AD-103).
export const listAtividades = async (
  tenantId: string,
  query: ListDiarioQuery,
  periodo: { from?: Date; to?: Date },
): Promise<{ items: AtividadeRecord[]; total: number }> =>
  withDbTiming('diario.listAtividades', async () => {
    const filter = tenantScoped({
      Tenant: tenantId,
      ...(query.userId ? { User: toObjectId(query.userId) } : {}),
      ...(query.modulo ? { modulo: query.modulo } : {}),
      ...(query.acao ? { acao: query.acao } : {}),
      ...(periodo.from || periodo.to
        ? { createdAt: { ...(periodo.from ? { $gte: periodo.from } : {}), ...(periodo.to ? { $lt: periodo.to } : {}) } }
        : {}),
    });
    const [docs, total] = await Promise.all([
      Atividade.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Atividade.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

// As últimas exportações de dados do escritório (substitui `Tenant.dataExports`, AD-134).
export const ultimasExportacoes = async (tenantId: string, limit: number): Promise<AtividadeRecord[]> =>
  withDbTiming('diario.ultimasExportacoes', async () => {
    const docs = await Atividade.find(tenantScoped({ Tenant: tenantId, acao: 'export' as const }))
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map(toRecord);
  });
