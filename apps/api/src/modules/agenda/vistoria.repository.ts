import type { VistoriaDados } from '@ethica/contracts';
import { VISTORIA_DADOS_VAZIOS } from '@ethica/contracts';
import type { VistoriaDocument } from '@ethica/db';
import { tenantScoped, toObjectId, Vistoria } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { MidiaRecord, VistoriaMidiaWrite, VistoriaRecord } from './vistoria.schema.js';

const midiaToRecord = ({ key: _key, ...midia }: VistoriaMidiaWrite): MidiaRecord => midia;

const toRecord = (doc: VistoriaDocument): VistoriaRecord => ({
  compromissoId: doc.Compromisso.toString(),
  caseId: doc.Case?.toString(),
  versao: doc.versao,
  dados: doc.dados,
  midias: doc.midias.map(midiaToRecord),
  updatedAt: doc.updatedAt,
});

const doCompromisso = (tenantId: string, compromissoId: string) =>
  tenantScoped({ Tenant: tenantId, Compromisso: compromissoId });

export const findByCompromisso = async (tenantId: string, compromissoId: string): Promise<VistoriaRecord | null> =>
  withDbTiming('vistoria.findByCompromisso', async () => {
    const doc = await Vistoria.findOne(doCompromisso(tenantId, compromissoId)).lean();
    return doc ? toRecord(doc) : null;
  });

export const findByCompromissos = async (tenantId: string, ids: string[]): Promise<Map<string, VistoriaRecord>> =>
  withDbTiming('vistoria.findByCompromissos', async () => {
    if (!ids.length) return new Map();
    const docs = await Vistoria.find(tenantScoped({ Tenant: tenantId, Compromisso: { $in: ids } })).lean();
    return new Map(docs.map((doc) => [doc.Compromisso.toString(), toRecord(doc)]));
  });

export const listByCase = async (tenantId: string, caseId: string): Promise<VistoriaRecord[]> =>
  withDbTiming('vistoria.listByCase', async () => {
    const docs = await Vistoria.find(tenantScoped({ Tenant: tenantId, Case: caseId }))
      .sort({ updatedAt: -1 })
      .lean();
    return docs.map(toRecord);
  });

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Grava o formulário só se a versão do servidor for a que o aparelho conhecia (AD-128).
// `versao` 0 cria o registro; `null`: outra gravação chegou antes (conflito).
export const salvar = async (
  tenantId: string,
  compromissoId: string,
  caseId: string | undefined,
  versao: number,
  dados: VistoriaDados,
): Promise<VistoriaRecord | null> =>
  withDbTiming('vistoria.salvar', async () => {
    try {
      const doc = await Vistoria.findOneAndUpdate(
        { ...doCompromisso(tenantId, compromissoId), versao },
        {
          $set: { dados, ...(caseId ? { Case: caseId } : {}) },
          $inc: { versao: 1 },
          $setOnInsert: { midias: [] },
        },
        { upsert: versao === 0, returnDocument: 'after', runValidators: true },
      ).lean();
      return doc ? toRecord(doc) : null;
    } catch (error) {
      if (isDuplicateKeyError(error)) return null;
      throw error;
    }
  });

// Mídia pode chegar antes do formulário (offline): o registro nasce vazio, na versão 0.
export const addMidia = async (
  tenantId: string,
  compromissoId: string,
  caseId: string | undefined,
  midia: VistoriaMidiaWrite,
): Promise<boolean> =>
  withDbTiming('vistoria.addMidia', async () => {
    await Vistoria.updateOne(
      doCompromisso(tenantId, compromissoId),
      {
        $setOnInsert: {
          versao: 0,
          dados: VISTORIA_DADOS_VAZIOS,
          ...(caseId ? { Case: toObjectId(caseId) } : {}),
        },
      },
      { upsert: true },
    ).catch((error: unknown) => {
      if (!isDuplicateKeyError(error)) throw error;
    });
    const result = await Vistoria.updateOne(
      { ...doCompromisso(tenantId, compromissoId), 'midias.id': { $ne: midia.id } },
      { $push: { midias: midia } },
    );
    return result.modifiedCount === 1;
  });

export const findMidia = async (
  tenantId: string,
  compromissoId: string,
  midiaId: string,
): Promise<VistoriaMidiaWrite | null> =>
  withDbTiming('vistoria.findMidia', async () => {
    const doc = await Vistoria.findOne(doCompromisso(tenantId, compromissoId), {
      midias: { $elemMatch: { id: midiaId } },
    }).lean();
    return doc?.midias?.[0] ?? null;
  });

export const updateLegenda = async (
  tenantId: string,
  compromissoId: string,
  midiaId: string,
  legenda: string,
): Promise<boolean> =>
  withDbTiming('vistoria.updateLegenda', async () => {
    const result = await Vistoria.updateOne(
      { ...doCompromisso(tenantId, compromissoId), 'midias.id': midiaId },
      { $set: { 'midias.$.legenda': legenda } },
    );
    return result.matchedCount === 1;
  });

// Devolve a mídia tirada (para apagar o arquivo e devolver a cota) ou `null`.
export const removeMidia = async (
  tenantId: string,
  compromissoId: string,
  midiaId: string,
): Promise<VistoriaMidiaWrite | null> =>
  withDbTiming('vistoria.removeMidia', async () => {
    const before = await Vistoria.findOneAndUpdate(
      { ...doCompromisso(tenantId, compromissoId), 'midias.id': midiaId },
      { $pull: { midias: { id: midiaId } } },
      { returnDocument: 'before', projection: { midias: { $elemMatch: { id: midiaId } } } },
    ).lean();
    return before?.midias?.[0] ?? null;
  });

// Compromisso excluído leva o registro (AD-130); devolve as mídias para apagar os arquivos.
export const deleteByCompromisso = async (tenantId: string, compromissoId: string): Promise<VistoriaMidiaWrite[]> =>
  withDbTiming('vistoria.deleteByCompromisso', async () => {
    const doc = await Vistoria.findOneAndDelete(doCompromisso(tenantId, compromissoId)).lean();
    return doc?.midias ?? [];
  });
