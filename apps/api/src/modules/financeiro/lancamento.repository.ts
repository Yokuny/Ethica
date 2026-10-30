import type { LancamentoDocument } from '@ethica/db';
import { Lancamento, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CategoriaTotal,
  CreateLancamento,
  FinanceiroResumo,
  FluxoMensal,
  LancamentoRecord,
  ListLancamentosQuery,
  UpdateLancamento,
} from './lancamento.schema.js';

const toRecord = (doc: LancamentoDocument): LancamentoRecord => ({
  id: doc._id.toString(),
  natureza: doc.natureza,
  categoria: doc.categoria,
  descricao: doc.descricao,
  valorCents: doc.valorCents,
  vencimento: doc.vencimento,
  status: doc.status,
  liquidadoEm: doc.liquidadoEm,
  periciaId: doc.Pericia?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toDocumentFields = ({ periciaId, ...data }: UpdateLancamento) => {
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  if (periciaId !== undefined) fields.Pericia = periciaId;
  return fields;
};

export const createLancamento = async (tenantId: string, data: CreateLancamento): Promise<LancamentoRecord> =>
  withDbTiming('financeiro.createLancamento', async () => {
    const doc = await Lancamento.create({ Tenant: tenantId, ...toDocumentFields(data) });
    return toRecord(doc);
  });

export const findById = async (tenantId: string, id: string): Promise<LancamentoRecord | null> =>
  withDbTiming('financeiro.findById', async () => {
    const doc = await Lancamento.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const updateLancamento = async (
  tenantId: string,
  id: string,
  data: UpdateLancamento,
): Promise<LancamentoRecord | null> =>
  withDbTiming('financeiro.updateLancamento', async () => {
    const doc = await Lancamento.findOneAndUpdate(tenantScoped({ Tenant: tenantId, _id: id }), toDocumentFields(data), {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteLancamento = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('financeiro.deleteLancamento', async () => {
    const result = await Lancamento.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

const situacaoFilter = (situacao: ListLancamentosQuery['situacao'], today: string) => {
  if (!situacao) return {};
  if (situacao === 'atrasado') return { status: 'previsto' as const, vencimento: { $lt: today } };
  return { status: situacao };
};

export const listLancamentos = async (
  tenantId: string,
  query: ListLancamentosQuery,
  today: string,
): Promise<{ items: LancamentoRecord[]; total: number }> =>
  withDbTiming('financeiro.listLancamentos', async () => {
    const vencimento = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lt: query.to } : {}),
    };
    const filter = tenantScoped({
      Tenant: tenantId,
      ...(query.natureza ? { natureza: query.natureza } : {}),
      ...(query.periciaId ? { Pericia: query.periciaId } : {}),
      ...(Object.keys(vencimento).length ? { vencimento } : {}),
      ...situacaoFilter(query.situacao, today),
    });
    const [docs, total] = await Promise.all([
      Lancamento.find(filter)
        .sort({ vencimento: -1, _id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Lancamento.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

const sumCents = async (match: Record<string, unknown>): Promise<number> => {
  const [row] = await Lancamento.aggregate<{ total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$valorCents' } } },
  ]);
  return row?.total ?? 0;
};

// `monthStart`/`nextMonthStart` são `YYYY-MM-DD` do fuso de exibição, calculados pelo service.
export const resumo = async (
  tenantId: string,
  range: { today: string; monthStart: string; nextMonthStart: string },
): Promise<FinanceiroResumo> =>
  withDbTiming('financeiro.resumo', async () => {
    const Tenant = toObjectId(tenantId);
    const mes = { $gte: range.monthStart, $lt: range.nextMonthStart };
    const [aReceberCents, atrasadoCents, recebidoMesCents, despesasMesCents] = await Promise.all([
      sumCents({ Tenant, natureza: 'receita', status: 'previsto' }),
      sumCents({ Tenant, natureza: 'receita', status: 'previsto', vencimento: { $lt: range.today } }),
      sumCents({ Tenant, natureza: 'receita', status: 'liquidado', liquidadoEm: mes }),
      sumCents({ Tenant, natureza: 'despesa', status: { $ne: 'cancelado' }, vencimento: mes }),
    ]);
    return { aReceberCents, atrasadoCents, recebidoMesCents, despesasMesCents };
  });

// Uma linha por mês (`YYYY-MM`): receita liquidada pelo mês da liquidação; receita
// prevista e despesa pelo mês do vencimento. Meses sem lançamento entram zerados.
export const fluxoMensal = async (tenantId: string, meses: string[]): Promise<FluxoMensal[]> =>
  withDbTiming('financeiro.fluxoMensal', async () => {
    const first = `${meses[0]}-01`;
    const rows = await Lancamento.aggregate<{ _id: { mes: string; serie: string }; total: number }>([
      { $match: { Tenant: toObjectId(tenantId), status: { $ne: 'cancelado' } } },
      {
        $project: {
          valorCents: 1,
          serie: {
            $cond: [
              { $eq: ['$natureza', 'despesa'] },
              'despesas',
              { $cond: [{ $eq: ['$status', 'liquidado'] }, 'recebido', 'aReceber'] },
            ],
          },
          data: { $cond: [{ $eq: ['$status', 'liquidado'] }, '$liquidadoEm', '$vencimento'] },
        },
      },
      { $match: { data: { $gte: first } } },
      { $group: { _id: { mes: { $substrBytes: ['$data', 0, 7] }, serie: '$serie' }, total: { $sum: '$valorCents' } } },
    ]);
    const totals = new Map(rows.map((row) => [`${row._id.mes}:${row._id.serie}`, row.total]));
    return meses.map((mes) => ({
      mes,
      recebidoCents: totals.get(`${mes}:recebido`) ?? 0,
      aReceberCents: totals.get(`${mes}:aReceber`) ?? 0,
      despesasCents: totals.get(`${mes}:despesas`) ?? 0,
    }));
  });

export const totaisPorCategoria = async (tenantId: string, natureza: string): Promise<CategoriaTotal[]> =>
  withDbTiming('financeiro.totaisPorCategoria', async () => {
    const rows = await Lancamento.aggregate<{ _id: CategoriaTotal['categoria']; total: number }>([
      { $match: { Tenant: toObjectId(tenantId), natureza, status: { $ne: 'cancelado' } } },
      { $group: { _id: '$categoria', total: { $sum: '$valorCents' } } },
      { $sort: { total: -1 } },
    ]);
    return rows.map((row) => ({ categoria: row._id, totalCents: row.total }));
  });
