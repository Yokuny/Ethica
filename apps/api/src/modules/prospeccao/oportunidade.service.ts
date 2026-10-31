import type { DatajudSearch } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { DatajudClient } from '../../providers/datajudClient.js';
import { DatajudUnavailableError } from '../../providers/datajudClient.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as oportunidadeRepository from './oportunidade.repository.js';
import type {
  ConverterOportunidade,
  CreateOportunidade,
  DatajudResultado,
  ListOportunidadesQuery,
  OportunidadeRecord,
  UpdateOportunidade,
} from './oportunidade.schema.js';

export class OportunidadeNotFoundError extends KeyedError {}

const isDuplicateKeyError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;

// Busca de possíveis nomeações no Datajud; cada resultado já salvo leva o id da oportunidade.
export const searchDatajud = async (
  client: DatajudClient | undefined,
  tenantId: string,
  query: DatajudSearch,
): Promise<{ items: DatajudResultado[]; cursor?: (string | number)[] }> => {
  if (!client) throw new CustomError('datajud_not_configured', 503);
  try {
    const result = await client.search(query);
    const saved = await oportunidadeRepository.findIdsByNumeros(
      tenantId,
      result.items.map((item) => item.numeroProcesso),
    );
    return {
      ...result,
      items: result.items.map((item) => {
        const oportunidadeId = saved.get(item.numeroProcesso);
        return oportunidadeId ? { ...item, oportunidadeId } : item;
      }),
    };
  } catch (e) {
    if (e instanceof DatajudUnavailableError) throw new CustomError('datajud_unavailable', 503, e.message);
    throw e;
  }
};

export const createOportunidade = async (tenantId: string, data: CreateOportunidade): Promise<OportunidadeRecord> => {
  try {
    return await oportunidadeRepository.createOportunidade(tenantId, data);
  } catch (e) {
    if (isDuplicateKeyError(e)) throw new CustomError('opportunity_already_saved', 409);
    throw e;
  }
};

const getOportunidade = async (tenantId: string, id: string): Promise<OportunidadeRecord> => {
  const oportunidade = await oportunidadeRepository.findById(tenantId, id);
  if (!oportunidade) throw new OportunidadeNotFoundError('not_found');
  return oportunidade;
};

export const updateOportunidade = async (
  tenantId: string,
  id: string,
  data: UpdateOportunidade,
): Promise<OportunidadeRecord> => {
  const updated = await oportunidadeRepository.updateOportunidade(tenantId, id, data);
  if (updated) return updated;
  // Sem atualização: ou não existe, ou já foi convertida.
  await getOportunidade(tenantId, id);
  throw new CustomError('opportunity_already_converted', 409);
};

export const deleteOportunidade = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await oportunidadeRepository.deleteOportunidade(tenantId, id);
  if (deletedCount === 0) throw new OportunidadeNotFoundError('not_found');
};

export const listOportunidades = (tenantId: string, query: ListOportunidadesQuery) =>
  oportunidadeRepository.listOportunidades(tenantId, query);
export const oportunidadeStats = (tenantId: string) => oportunidadeRepository.stats(tenantId);

// A resposta precisa do id da perícia criada, então a criação é chamada direta
// ao service dono (não evento). Perícia já cadastrada responde 409 e a
// oportunidade continua aberta.
export const converterOportunidade = async (
  tenantId: string,
  id: string,
  data: ConverterOportunidade,
): Promise<{ periciaId: string }> => {
  const oportunidade = await getOportunidade(tenantId, id);
  if (oportunidade.status === 'converted') throw new CustomError('opportunity_already_converted', 409);
  const pericia = await periciaService.createPericia({
    ...data,
    tenant: tenantId,
    numeroProcesso: oportunidade.numeroProcesso,
    tribunal: oportunidade.tribunal.toUpperCase(),
    vara: oportunidade.orgaoJulgador,
    oportunidadeId: oportunidade.id,
  });
  await oportunidadeRepository.updateOportunidade(tenantId, id, { status: 'converted', periciaId: pericia.id });
  return { periciaId: pericia.id };
};

export const listForExport = (tenantId: string) => oportunidadeRepository.listAll(tenantId);
