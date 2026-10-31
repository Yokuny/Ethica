import type { LancamentoStatus } from '@ethica/contracts';
import type { LancamentoDocument } from '@ethica/db';
import { Lancamento, newObjectId, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CategoriaTotal,
  CreateLancamento,
  CreateParcela,
  FinanceiroResumo,
  FluxoMensal,
  LancamentoRecord,
  ListLancamentosQuery,
  UpdateLancamento,
} from './lancamento.schema.js';

const toRecord = (doc: LancamentoDocument): LancamentoRecord => {
  const parcelas = (doc.parcelas ?? []).map((parcela) => ({
    id: parcela._id.toString(),
    valorCents: parcela.valorCents,
    data: parcela.data,
    conta: parcela.conta,
  }));
  const recebidoCents = parcelas.reduce((total, parcela) => total + parcela.valorCents, 0);
  return {
    id: doc._id.toString(),
    natureza: doc.natureza,
    categoria: doc.categoria,
    descricao: doc.descricao,
    valorCents: doc.valorCents,
    vencimento: doc.vencimento,
    status: doc.status,
    liquidadoEm: doc.liquidadoEm,
    parcelas,
    ...(doc.natureza === 'income' ? { recebidoCents, saldoCents: doc.valorCents - recebidoCents } : {}),
    periciaId: doc.Pericia?.toString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const toDocumentFields = ({ periciaId, ...data }: UpdateLancamento) => {
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  if (periciaId !== undefined) fields.Pericia = periciaId;
  return fields;
};

// Status do honorário (AD-111) calculado no próprio update, a partir das parcelas:
// nenhuma → previsto; menos que o valor → parcial; o valor todo → liquidado.
const RECEBIDO = { $sum: '$parcelas.valorCents' };
const STATUS_DA_RECEITA = {
  $cond: [{ $eq: [RECEBIDO, 0] }, 'expected', { $cond: [{ $lt: [RECEBIDO, '$valorCents'] }, 'partial', 'settled'] }],
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

// O honorário fixado automático da perícia (AD-111: alterar o valor atualiza este, não cria outro).
export const findHonorarioFixado = async (tenantId: string, periciaId: string): Promise<LancamentoRecord | null> =>
  withDbTiming('financeiro.findHonorarioFixado', async () => {
    const doc = await Lancamento.findOne(
      tenantScoped({
        Tenant: tenantId,
        Pericia: periciaId,
        natureza: 'income' as const,
        categoria: 'fixed_fees' as const,
      }),
    )
      .sort({ createdAt: -1 })
      .lean();
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

// Edição de honorário: grava os campos e recalcula o status. Com valor novo, só atualiza se o
// já recebido couber nele — `null` quando não existe ou quando o valor ficaria abaixo do recebido.
export const updateReceita = async (
  tenantId: string,
  id: string,
  data: UpdateLancamento,
): Promise<LancamentoRecord | null> =>
  withDbTiming('financeiro.updateReceita', async () => {
    const fields = Object.fromEntries(
      Object.entries(toDocumentFields(data)).map(([key, value]) => [
        key,
        key === 'Pericia' ? toObjectId(value as string) : { $literal: value },
      ]),
    );
    const doc = await Lancamento.findOneAndUpdate(
      {
        ...tenantScoped({ Tenant: tenantId, _id: id, natureza: 'income' as const }),
        ...(data.valorCents !== undefined ? { $expr: { $lte: [RECEBIDO, data.valorCents] } } : {}),
      },
      [{ $set: fields }, { $set: { status: STATUS_DA_RECEITA } }],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Parcela entra só se couber no saldo — a condição está no próprio update, então duas
// parcelas simultâneas não passam do valor. `null`: inexistente, despesa ou acima do saldo.
export const addParcela = async (
  tenantId: string,
  id: string,
  parcela: CreateParcela,
): Promise<LancamentoRecord | null> =>
  withDbTiming('financeiro.addParcela', async () => {
    const nova = {
      _id: newObjectId(),
      valorCents: parcela.valorCents,
      data: parcela.data,
      ...(parcela.conta ? { conta: parcela.conta } : {}),
    };
    const doc = await Lancamento.findOneAndUpdate(
      {
        ...tenantScoped({ Tenant: tenantId, _id: id, natureza: 'income' as const }),
        $expr: { $lte: [{ $add: [RECEBIDO, parcela.valorCents] }, '$valorCents'] },
      },
      [
        { $set: { parcelas: { $concatArrays: [{ $ifNull: ['$parcelas', []] }, [{ $literal: nova }]] } } },
        { $set: { status: STATUS_DA_RECEITA } },
      ],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Estorno: tira a parcela e recalcula o status. `null` se o lançamento ou a parcela não existem.
export const removeParcela = async (
  tenantId: string,
  id: string,
  parcelaId: string,
): Promise<LancamentoRecord | null> =>
  withDbTiming('financeiro.removeParcela', async () => {
    const parcelaOid = toObjectId(parcelaId);
    const doc = await Lancamento.findOneAndUpdate(
      { ...tenantScoped({ Tenant: tenantId, _id: id, natureza: 'income' as const }), 'parcelas._id': parcelaOid },
      [
        { $set: { parcelas: { $filter: { input: '$parcelas', cond: { $ne: ['$$this._id', parcelaOid] } } } } },
        { $set: { status: STATUS_DA_RECEITA } },
      ],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteLancamento = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('financeiro.deleteLancamento', async () => {
    const result = await Lancamento.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

const ABERTOS: LancamentoStatus[] = ['expected', 'partial'];

const situacaoFilter = (situacao: ListLancamentosQuery['situacao'], today: string) => {
  if (!situacao) return {};
  if (situacao === 'overdue') return { status: { $in: ABERTOS }, vencimento: { $lt: today } };
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

const sum = async (pipeline: object[]): Promise<number> => {
  const [row] = await Lancamento.aggregate<{ total: number }>([
    ...(pipeline as never[]),
    { $group: { _id: null, total: { $sum: '$valor' } } },
  ]);
  return row?.total ?? 0;
};

// Saldo a receber das receitas abertas (valor − parcelas).
const SALDO = { $subtract: ['$valorCents', RECEBIDO] };

// `monthStart`/`nextMonthStart` são `YYYY-MM-DD` do fuso de exibição, calculados pelo service.
export const resumo = async (
  tenantId: string,
  range: { today: string; monthStart: string; nextMonthStart: string },
): Promise<FinanceiroResumo> =>
  withDbTiming('financeiro.resumo', async () => {
    const Tenant = toObjectId(tenantId);
    const mes = { $gte: range.monthStart, $lt: range.nextMonthStart };
    const abertas = { Tenant, natureza: 'income', status: { $in: ABERTOS } };
    const [aReceberCents, atrasadoCents, recebidoMesCents, despesasMesCents] = await Promise.all([
      sum([{ $match: abertas }, { $project: { valor: SALDO } }]),
      sum([{ $match: { ...abertas, vencimento: { $lt: range.today } } }, { $project: { valor: SALDO } }]),
      // Recebido no mês = parcelas pela data em que caíram na conta (PRZ-02.5).
      sum([
        { $match: { Tenant, natureza: 'income' } },
        { $unwind: '$parcelas' },
        { $match: { 'parcelas.data': mes } },
        { $project: { valor: '$parcelas.valorCents' } },
      ]),
      sum([
        { $match: { Tenant, natureza: 'expense', status: { $ne: 'canceled' }, vencimento: mes } },
        { $project: { valor: '$valorCents' } },
      ]),
    ]);
    return { aReceberCents, atrasadoCents, recebidoMesCents, despesasMesCents };
  });

// Uma linha por mês (`YYYY-MM`): recebido pela data de cada parcela; a receber pelo saldo das
// receitas abertas no mês do vencimento; despesa paga pelo mês da liquidação e prevista pelo
// do vencimento. Meses sem movimento entram zerados.
export const fluxoMensal = async (tenantId: string, meses: string[]): Promise<FluxoMensal[]> =>
  withDbTiming('financeiro.fluxoMensal', async () => {
    const Tenant = toObjectId(tenantId);
    const first = `${meses[0]}-01`;
    const porMes = (serie: string, data: unknown, valor: unknown) => [
      { $project: { serie: { $literal: serie }, data, valor } },
      { $match: { data: { $gte: first } } },
    ];
    const rows = await Lancamento.aggregate<{ _id: { mes: string; serie: string }; total: number }>([
      { $match: { Tenant, status: { $ne: 'canceled' } } },
      {
        $facet: {
          recebido: [
            { $match: { natureza: 'income' } },
            { $unwind: '$parcelas' },
            ...porMes('recebido', '$parcelas.data', '$parcelas.valorCents'),
          ],
          aReceber: [
            { $match: { natureza: 'income', status: { $in: ABERTOS } } },
            ...porMes('aReceber', '$vencimento', SALDO),
          ],
          despesas: [
            { $match: { natureza: 'expense' } },
            ...porMes(
              'despesas',
              { $cond: [{ $eq: ['$status', 'settled'] }, '$liquidadoEm', '$vencimento'] },
              '$valorCents',
            ),
          ],
        },
      },
      { $project: { linhas: { $concatArrays: ['$recebido', '$aReceber', '$despesas'] } } },
      { $unwind: '$linhas' },
      { $replaceRoot: { newRoot: '$linhas' } },
      { $group: { _id: { mes: { $substrBytes: ['$data', 0, 7] }, serie: '$serie' }, total: { $sum: '$valor' } } },
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
      { $match: { Tenant: toObjectId(tenantId), natureza, status: { $ne: 'canceled' } } },
      { $group: { _id: '$categoria', total: { $sum: '$valorCents' } } },
      { $sort: { total: -1 } },
    ]);
    return rows.map((row) => ({ categoria: row._id, totalCents: row.total }));
  });

// Exportação de dados (DOC-04), ficha da perícia (com `periciaId`) e relatório do período
// (com `periodo`: o que teve parcela, liquidação ou vencimento entre `from` e `to`).
export const listAll = async (
  tenantId: string,
  filter: { periciaId?: string; periodo?: { from: string; to: string } } = {},
): Promise<LancamentoRecord[]> =>
  withDbTiming('financeiro.listAll', async () => {
    const entre = filter.periodo ? { $gte: filter.periodo.from, $lte: filter.periodo.to } : undefined;
    const docs = await Lancamento.find(
      tenantScoped({
        Tenant: tenantId,
        ...(filter.periciaId ? { Pericia: filter.periciaId } : {}),
        ...(entre ? { $or: [{ 'parcelas.data': entre }, { liquidadoEm: entre }, { vencimento: entre }] } : {}),
      }),
    )
      .sort({ vencimento: 1 })
      .lean();
    return docs.map(toRecord);
  });
