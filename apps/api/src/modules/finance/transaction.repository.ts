import type { TransactionCategory, TransactionStatus } from '@ethica/contracts';
import type { TransactionDocument } from '@ethica/db';
import { newObjectId, Transaction, tenantScoped, toObjectId } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type {
  CategoryTotal,
  CreateInstallment,
  CreateTransaction,
  FinanceSummary,
  ListTransactionsQuery,
  MonthlyFlow,
  TransactionRecord,
  UpdateTransaction,
} from './transaction.schema.js';

const toRecord = (doc: TransactionDocument): TransactionRecord => {
  const installments = (doc.installments ?? []).map((installment) => ({
    id: installment._id.toString(),
    amountCents: installment.amountCents,
    data: installment.data,
    account: installment.account,
  }));
  const receivedCents = installments.reduce((total, installment) => total + installment.amountCents, 0);
  return {
    id: doc._id.toString(),
    kind: doc.kind,
    category: doc.category,
    descricao: doc.descricao,
    amountCents: doc.amountCents,
    dueDate: doc.dueDate,
    status: doc.status,
    settledDate: doc.settledDate,
    installments,
    ...(doc.kind === 'income' ? { receivedCents, balanceCents: doc.amountCents - receivedCents } : {}),
    caseId: doc.Case?.toString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const toDocumentFields = ({ caseId, ...data }: UpdateTransaction) => {
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  if (caseId !== undefined) fields.Case = caseId;
  return fields;
};

// Status do honorário (AD-111) calculado no próprio update, a partir das parcelas:
// nenhuma → previsto; menos que o valor → parcial; o valor todo → liquidado.
const RECEIVED = { $sum: '$installments.amountCents' };
const INCOME_STATUS = {
  $cond: [{ $eq: [RECEIVED, 0] }, 'expected', { $cond: [{ $lt: [RECEIVED, '$amountCents'] }, 'partial', 'settled'] }],
};

export const createTransaction = async (tenantId: string, data: CreateTransaction): Promise<TransactionRecord> =>
  withDbTiming('finance.createTransaction', async () => {
    const doc = await Transaction.create({ Tenant: tenantId, ...toDocumentFields(data) });
    return toRecord(doc);
  });

export const findById = async (tenantId: string, id: string): Promise<TransactionRecord | null> =>
  withDbTiming('finance.findById', async () => {
    const doc = await Transaction.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

// O honorário fixado automático da perícia (AD-111: alterar o valor atualiza este, não cria outro).
export const findFixedFee = async (tenantId: string, caseId: string): Promise<TransactionRecord | null> =>
  withDbTiming('finance.findFixedFee', async () => {
    const doc = await Transaction.findOne(
      tenantScoped({
        Tenant: tenantId,
        Case: caseId,
        kind: 'income' as const,
        // O honorário automático da perícia, fixado ou contratado (AD-135): um por perícia.
        category: { $in: ['fixed_fees', 'contracted_fees'] as TransactionCategory[] },
      }),
    )
      .sort({ createdAt: -1 })
      .lean();
    return doc ? toRecord(doc) : null;
  });

export const updateTransaction = async (
  tenantId: string,
  id: string,
  data: UpdateTransaction,
): Promise<TransactionRecord | null> =>
  withDbTiming('finance.updateTransaction', async () => {
    const doc = await Transaction.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      toDocumentFields(data),
      {
        returnDocument: 'after',
        runValidators: true,
      },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Edição de honorário: grava os campos e recalcula o status. Com valor novo, só atualiza se o
// já recebido couber nele — `null` quando não existe ou quando o valor ficaria abaixo do recebido.
export const updateIncome = async (
  tenantId: string,
  id: string,
  data: UpdateTransaction,
): Promise<TransactionRecord | null> =>
  withDbTiming('finance.updateIncome', async () => {
    const fields = Object.fromEntries(
      Object.entries(toDocumentFields(data)).map(([key, value]) => [
        key,
        key === 'Case' ? toObjectId(value as string) : { $literal: value },
      ]),
    );
    const doc = await Transaction.findOneAndUpdate(
      {
        ...tenantScoped({ Tenant: tenantId, _id: id, kind: 'income' as const }),
        ...(data.amountCents !== undefined ? { $expr: { $lte: [RECEIVED, data.amountCents] } } : {}),
      },
      [{ $set: fields }, { $set: { status: INCOME_STATUS } }],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Parcela entra só se couber no saldo — a condição está no próprio update, então duas
// parcelas simultâneas não passam do valor. `null`: inexistente, despesa ou acima do saldo.
export const addInstallment = async (
  tenantId: string,
  id: string,
  installment: CreateInstallment,
): Promise<TransactionRecord | null> =>
  withDbTiming('finance.addInstallment', async () => {
    const nova = {
      _id: newObjectId(),
      amountCents: installment.amountCents,
      data: installment.data,
      ...(installment.account ? { account: installment.account } : {}),
    };
    const doc = await Transaction.findOneAndUpdate(
      {
        ...tenantScoped({ Tenant: tenantId, _id: id, kind: 'income' as const }),
        $expr: { $lte: [{ $add: [RECEIVED, installment.amountCents] }, '$amountCents'] },
      },
      [
        { $set: { installments: { $concatArrays: [{ $ifNull: ['$installments', []] }, [{ $literal: nova }]] } } },
        { $set: { status: INCOME_STATUS } },
      ],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

// Estorno: tira a parcela e recalcula o status. `null` se o lançamento ou a parcela não existem.
export const removeInstallment = async (
  tenantId: string,
  id: string,
  installmentId: string,
): Promise<TransactionRecord | null> =>
  withDbTiming('finance.removeInstallment', async () => {
    const installmentOid = toObjectId(installmentId);
    const doc = await Transaction.findOneAndUpdate(
      { ...tenantScoped({ Tenant: tenantId, _id: id, kind: 'income' as const }), 'installments._id': installmentOid },
      [
        {
          $set: {
            installments: { $filter: { input: '$installments', cond: { $ne: ['$$this._id', installmentOid] } } },
          },
        },
        { $set: { status: INCOME_STATUS } },
      ],
      { returnDocument: 'after', updatePipeline: true },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteTransaction = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('finance.deleteTransaction', async () => {
    const result = await Transaction.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

const ABERTOS: TransactionStatus[] = ['expected', 'partial'];

const stateFilter = (state: ListTransactionsQuery['state'], today: string) => {
  if (!state) return {};
  if (state === 'overdue') return { status: { $in: ABERTOS }, dueDate: { $lt: today } };
  return { status: state };
};

export const listTransactions = async (
  tenantId: string,
  query: ListTransactionsQuery,
  today: string,
): Promise<{ items: TransactionRecord[]; total: number }> =>
  withDbTiming('finance.listTransactions', async () => {
    const dueDate = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lt: query.to } : {}),
    };
    const filter = tenantScoped({
      Tenant: tenantId,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.caseId ? { Case: query.caseId } : {}),
      ...(Object.keys(dueDate).length ? { dueDate } : {}),
      ...stateFilter(query.state, today),
    });
    const [docs, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ dueDate: -1, _id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    return { items: docs.map(toRecord), total };
  });

const sum = async (pipeline: object[]): Promise<number> => {
  const [row] = await Transaction.aggregate<{ total: number }>([
    ...(pipeline as never[]),
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return row?.total ?? 0;
};

// Saldo a receber das receitas abertas (valor − parcelas).
const BALANCE = { $subtract: ['$amountCents', RECEIVED] };

// `monthStart`/`nextMonthStart` são `YYYY-MM-DD` do fuso de exibição, calculados pelo service.
export const summary = async (
  tenantId: string,
  range: { today: string; monthStart: string; nextMonthStart: string },
): Promise<FinanceSummary> =>
  withDbTiming('finance.summary', async () => {
    const Tenant = toObjectId(tenantId);
    const month = { $gte: range.monthStart, $lt: range.nextMonthStart };
    const abertas = { Tenant, kind: 'income', status: { $in: ABERTOS } };
    const [receivableCents, lateCents, receivedMonthCents, expensesMonthCents] = await Promise.all([
      sum([{ $match: abertas }, { $project: { amount: BALANCE } }]),
      sum([{ $match: { ...abertas, dueDate: { $lt: range.today } } }, { $project: { amount: BALANCE } }]),
      // Recebido no mês = parcelas pela data em que caíram na conta (PRZ-02.5).
      sum([
        { $match: { Tenant, kind: 'income' } },
        { $unwind: '$installments' },
        { $match: { 'installments.data': month } },
        { $project: { amount: '$installments.amountCents' } },
      ]),
      sum([
        { $match: { Tenant, kind: 'expense', status: { $ne: 'canceled' }, dueDate: month } },
        { $project: { amount: '$amountCents' } },
      ]),
    ]);
    return { receivableCents, lateCents, receivedMonthCents, expensesMonthCents };
  });

// Uma linha por mês (`YYYY-MM`): recebido pela data de cada parcela; a receber pelo saldo das
// receitas abertas no mês do vencimento; despesa paga pelo mês da liquidação e prevista pelo
// do vencimento. Meses sem movimento entram zerados.
export const monthlyFlow = async (tenantId: string, months: string[]): Promise<MonthlyFlow[]> =>
  withDbTiming('finance.monthlyFlow', async () => {
    const Tenant = toObjectId(tenantId);
    const first = `${months[0]}-01`;
    const byMonth = (serie: string, data: unknown, amount: unknown) => [
      { $project: { serie: { $literal: serie }, data, amount } },
      { $match: { data: { $gte: first } } },
    ];
    const rows = await Transaction.aggregate<{ _id: { month: string; serie: string }; total: number }>([
      { $match: { Tenant, status: { $ne: 'canceled' } } },
      {
        $facet: {
          received: [
            { $match: { kind: 'income' } },
            { $unwind: '$installments' },
            ...byMonth('received', '$installments.data', '$installments.amountCents'),
          ],
          receivable: [
            { $match: { kind: 'income', status: { $in: ABERTOS } } },
            ...byMonth('receivable', '$dueDate', BALANCE),
          ],
          expenses: [
            { $match: { kind: 'expense' } },
            ...byMonth(
              'expenses',
              { $cond: [{ $eq: ['$status', 'settled'] }, '$settledDate', '$dueDate'] },
              '$amountCents',
            ),
          ],
        },
      },
      { $project: { rows: { $concatArrays: ['$received', '$receivable', '$expenses'] } } },
      { $unwind: '$rows' },
      { $replaceRoot: { newRoot: '$rows' } },
      { $group: { _id: { month: { $substrBytes: ['$data', 0, 7] }, serie: '$serie' }, total: { $sum: '$amount' } } },
    ]);
    const totals = new Map(rows.map((row) => [`${row._id.month}:${row._id.serie}`, row.total]));
    return months.map((month) => ({
      month,
      receivedCents: totals.get(`${month}:received`) ?? 0,
      receivableCents: totals.get(`${month}:receivable`) ?? 0,
      expensesCents: totals.get(`${month}:expenses`) ?? 0,
    }));
  });

export const totalsByCategory = async (tenantId: string, kind: string): Promise<CategoryTotal[]> =>
  withDbTiming('finance.totalsByCategory', async () => {
    const rows = await Transaction.aggregate<{ _id: CategoryTotal['category']; total: number }>([
      { $match: { Tenant: toObjectId(tenantId), kind, status: { $ne: 'canceled' } } },
      { $group: { _id: '$category', total: { $sum: '$amountCents' } } },
      { $sort: { total: -1 } },
    ]);
    return rows.map((row) => ({ category: row._id, totalCents: row.total }));
  });

// Exportação de dados (DOC-04), ficha da perícia (com `periciaId`) e relatório do período
// (com `periodo`: o que teve parcela, liquidação ou vencimento entre `from` e `to`).
export const listAll = async (
  tenantId: string,
  filter: { caseId?: string; period?: { from: string; to: string } } = {},
): Promise<TransactionRecord[]> =>
  withDbTiming('finance.listAll', async () => {
    const entre = filter.period ? { $gte: filter.period.from, $lte: filter.period.to } : undefined;
    const docs = await Transaction.find(
      tenantScoped({
        Tenant: tenantId,
        ...(filter.caseId ? { Case: filter.caseId } : {}),
        ...(entre ? { $or: [{ 'installments.data': entre }, { settledDate: entre }, { dueDate: entre }] } : {}),
      }),
    )
      .sort({ dueDate: 1 })
      .lean();
    return docs.map(toRecord);
  });
