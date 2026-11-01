import type { CompromissoTipo } from '@ethica/contracts';
import type { CompromissoDocument } from '@ethica/db';
import { Compromisso, tenantScoped } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { CompromissoRecord, CompromissoWrite } from './compromisso.schema.js';

const toRecord = (doc: CompromissoDocument): CompromissoRecord => ({
  id: doc._id.toString(),
  tipo: doc.tipo,
  titulo: doc.titulo,
  inicio: doc.inicio,
  fim: doc.fim,
  local: doc.local,
  caseId: doc.Case?.toString(),
  status: doc.status,
  origem: doc.origem,
  observacoes: doc.observacoes,
  motivo: doc.motivo,
  ...(doc.coordenadas && doc.coordenadas.endereco === doc.local
    ? { coordenadas: { lat: doc.coordenadas.lat, lng: doc.coordenadas.lng } }
    : {}),
  avisos: (doc.avisos ?? []).map((aviso) => ({
    userId: aviso.User.toString(),
    at: aviso.at,
    destinatarios: aviso.destinatarios,
  })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toDocumentFields = ({ caseId, motivo, ...data }: CompromissoWrite) => {
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  if (caseId !== undefined) fields.Case = caseId;
  if (motivo) fields.motivo = motivo;
  return fields;
};

export const createCompromisso = async (tenantId: string, data: CompromissoWrite): Promise<CompromissoRecord> =>
  withDbTiming('agenda.createCompromisso', async () => {
    const doc = await Compromisso.create({ Tenant: tenantId, ...toDocumentFields(data) });
    return toRecord(doc);
  });

export const findById = async (tenantId: string, id: string): Promise<CompromissoRecord | null> =>
  withDbTiming('agenda.findById', async () => {
    const doc = await Compromisso.findOne(tenantScoped({ Tenant: tenantId, _id: id })).lean();
    return doc ? toRecord(doc) : null;
  });

export const updateCompromisso = async (
  tenantId: string,
  id: string,
  data: CompromissoWrite,
): Promise<CompromissoRecord | null> =>
  withDbTiming('agenda.updateCompromisso', async () => {
    const doc = await Compromisso.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set: toDocumentFields(data), ...(data.motivo === null ? { $unset: { motivo: 1 } } : {}) },
      {
        returnDocument: 'after',
      },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const deleteCompromisso = async (tenantId: string, id: string): Promise<{ deletedCount: number }> =>
  withDbTiming('agenda.deleteCompromisso', async () => {
    const result = await Compromisso.deleteOne(tenantScoped({ Tenant: tenantId, _id: id }));
    return { deletedCount: result.deletedCount ?? 0 };
  });

// Tudo que toca o intervalo: começa antes do fim e termina depois do início.
export const listInRange = async (
  tenantId: string,
  range: { from: Date; to: Date; tipo?: CompromissoTipo; caseId?: string },
): Promise<CompromissoRecord[]> =>
  withDbTiming('agenda.listInRange', async () => {
    const docs = await Compromisso.find(
      tenantScoped({
        Tenant: tenantId,
        inicio: { $lt: range.to },
        fim: { $gt: range.from },
        ...(range.tipo ? { tipo: range.tipo } : {}),
        ...(range.caseId ? { Case: range.caseId } : {}),
      }),
    )
      .sort({ inicio: 1 })
      .limit(500)
      .lean();
    return docs.map(toRecord);
  });

export const listUpcoming = async (
  tenantId: string,
  options: { now: Date; limit: number; caseId?: string },
): Promise<CompromissoRecord[]> =>
  withDbTiming('agenda.listUpcoming', async () => {
    const docs = await Compromisso.find(
      tenantScoped({
        Tenant: tenantId,
        status: 'scheduled' as const,
        fim: { $gte: options.now },
        ...(options.caseId ? { Case: options.caseId } : {}),
      }),
    )
      .sort({ inicio: 1 })
      .limit(options.limit)
      .lean();
    return docs.map(toRecord);
  });

// Ficha da perícia (com `periciaId`) e exportação de dados (DOC-02, DOC-04), por início.
export const listAll = async (tenantId: string, filter: { caseId?: string } = {}): Promise<CompromissoRecord[]> =>
  withDbTiming('compromisso.listAll', async () => {
    const docs = await Compromisso.find(
      tenantScoped({ Tenant: tenantId, ...(filter.caseId ? { Case: filter.caseId } : {}) }),
    )
      .sort({ inicio: 1 })
      .lean();
    return docs.map(toRecord);
  });

// Cache da geocodificação do endereço atual (AD-131).
export const setCoordenadas = async (
  tenantId: string,
  id: string,
  coordenadas: { lat: number; lng: number; endereco: string },
): Promise<CompromissoRecord | null> =>
  withDbTiming('agenda.setCoordenadas', async () => {
    const doc = await Compromisso.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $set: { coordenadas } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });

export const addAviso = async (
  tenantId: string,
  id: string,
  aviso: { userId: string; destinatarios: string[] },
): Promise<CompromissoRecord | null> =>
  withDbTiming('agenda.addAviso', async () => {
    const doc = await Compromisso.findOneAndUpdate(
      tenantScoped({ Tenant: tenantId, _id: id }),
      { $push: { avisos: { User: aviso.userId, at: new Date(), destinatarios: aviso.destinatarios } } },
      { returnDocument: 'after' },
    ).lean();
    return doc ? toRecord(doc) : null;
  });
