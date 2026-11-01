import { LAUDO_IMG_SRC, VISTORIA_DADOS_VAZIOS, VISTORIA_MIDIA_LIMITES } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import * as officeService from '../identity/office.service.js';
import * as periciaService from '../pericia/pericia.service.js';
import type { CompromissoRecord } from './compromisso.schema.js';
import * as compromissoService from './compromisso.service.js';
import * as vistoriaRepository from './vistoria.repository.js';
import type {
  MidiaRecord,
  MidiaUploadQuery,
  PericiaDoCampo,
  SaveVistoria,
  VistoriaDoDia,
  VistoriaRecord,
} from './vistoria.schema.js';

// Outra gravação chegou antes (AD-128): o controller devolve 409 com a versão do servidor.
export class VistoriaConflictError extends KeyedError {
  constructor(readonly atual: VistoriaRecord) {
    super('inspection_conflict');
  }
}

const vazia = (compromisso: CompromissoRecord): VistoriaRecord => ({
  compromissoId: compromisso.id,
  periciaId: compromisso.periciaId,
  versao: 0,
  dados: VISTORIA_DADOS_VAZIOS,
  midias: [],
});

const requireStorage = (storage: FileStorage | undefined): FileStorage => {
  if (!storage) throw new CustomError('storage_not_configured', 503);
  return storage;
};

const proximoDia = (date: string): string => {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

const periciasDoCampo = async (tenantId: string, ids: string[]): Promise<Map<string, PericiaDoCampo>> => {
  const resumos = await periciaService.findResumosByIds(tenantId, ids);
  return new Map([...resumos].map(([id, resumo]) => [id, { id, ...resumo }]));
};

// CAM-01: tudo do dia (por horário) com o registro de cada compromisso, para o celular guardar.
export const listDia = async (tenantId: string, date: string): Promise<VistoriaDoDia[]> => {
  const compromissos = await compromissoService.listCompromissos(tenantId, { from: date, to: proximoDia(date) });
  const [vistorias, pericias] = await Promise.all([
    vistoriaRepository.findByCompromissos(
      tenantId,
      compromissos.map((compromisso) => compromisso.id),
    ),
    periciasDoCampo(tenantId, [...new Set(compromissos.flatMap((c) => (c.periciaId ? [c.periciaId] : [])))]),
  ]);
  return compromissos.map((compromisso) => {
    const pericia = compromisso.periciaId ? pericias.get(compromisso.periciaId) : undefined;
    return {
      compromisso,
      ...(pericia ? { pericia } : {}),
      vistoria: vistorias.get(compromisso.id) ?? vazia(compromisso),
    };
  });
};

export const getVistoria = async (tenantId: string, compromissoId: string): Promise<VistoriaDoDia> => {
  const compromisso = await compromissoService.getCompromisso(tenantId, compromissoId);
  const [vistoria, pericias] = await Promise.all([
    vistoriaRepository.findByCompromisso(tenantId, compromissoId),
    periciasDoCampo(tenantId, compromisso.periciaId ? [compromisso.periciaId] : []),
  ]);
  const pericia = compromisso.periciaId ? pericias.get(compromisso.periciaId) : undefined;
  return { compromisso, ...(pericia ? { pericia } : {}), vistoria: vistoria ?? vazia(compromisso) };
};

// CAM-02 e CAM-05: grava o formulário inteiro só sobre a versão que o aparelho conhecia.
export const salvarVistoria = async (
  tenantId: string,
  compromissoId: string,
  { versao, dados }: SaveVistoria,
): Promise<VistoriaRecord> => {
  const compromisso = await compromissoService.getCompromisso(tenantId, compromissoId);
  const salvo = await vistoriaRepository.salvar(tenantId, compromissoId, compromisso.periciaId, versao, dados);
  if (salvo) return salvo;
  throw new VistoriaConflictError(
    (await vistoriaRepository.findByCompromisso(tenantId, compromissoId)) ?? vazia(compromisso),
  );
};

// CAM-03/06/07: arquivo no storage com a cota reservada antes (AD-120, AD-129). Mesmo id de
// novo devolve a mídia já gravada (reenvio do offline, AD-128).
export const uploadMidia = async (
  storage: FileStorage | undefined,
  tenantId: string,
  compromissoId: string,
  midiaId: string,
  { tipo, legenda }: MidiaUploadQuery,
  arquivo: { body: Buffer; mime: string },
): Promise<MidiaRecord> => {
  const files = requireStorage(storage);
  const limite = VISTORIA_MIDIA_LIMITES[tipo];
  if (!limite.mimes.includes(arquivo.mime)) throw new CustomError('unsupported_file_type', 415, arquivo.mime);
  if (arquivo.body.length > limite.maxBytes) throw new CustomError('file_too_large', 413);
  const compromisso = await compromissoService.getCompromisso(tenantId, compromissoId);
  const atual = await vistoriaRepository.findByCompromisso(tenantId, compromissoId);
  const existente = atual?.midias.find((midia) => midia.id === midiaId);
  if (existente) return existente;
  if ((atual?.midias.filter((midia) => midia.tipo === tipo).length ?? 0) >= limite.maxPorVistoria) {
    throw new CustomError('media_limit_reached', 422);
  }
  const midia = {
    id: midiaId,
    tipo,
    key: `tenants/${tenantId}/vistorias/${compromissoId}/${midiaId}`,
    bytes: arquivo.body.length,
    mime: arquivo.mime,
    ...(legenda ? { legenda } : {}),
    createdAt: new Date(),
  };
  await officeService.reservarArquivo(tenantId, midia.bytes);
  try {
    await files.put(midia.key, arquivo.body, midia.mime);
    if (!(await vistoriaRepository.addMidia(tenantId, compromissoId, compromisso.periciaId, midia))) {
      // Outro envio do mesmo id ganhou a corrida: o arquivo é o mesmo, só a reserva sobra.
      await officeService.devolverArquivo(tenantId, midia.bytes);
    }
  } catch (error) {
    await officeService.devolverArquivo(tenantId, midia.bytes);
    throw error;
  }
  const { key: _key, ...record } = midia;
  return record;
};

export const getMidia = async (
  storage: FileStorage | undefined,
  tenantId: string,
  compromissoId: string,
  midiaId: string,
): Promise<{ body: Buffer; mime: string }> => {
  const midia = await vistoriaRepository.findMidia(tenantId, compromissoId, midiaId);
  const body = midia && storage ? await storage.get(midia.key) : null;
  if (!midia || !body) throw new CustomError('not_found', 404);
  return { body, mime: midia.mime };
};

// Foto do laudo (AD-129): `src` gravado no HTML → bytes, só do próprio tenant; `null` se sumiu.
export const lerFotoDoLaudo = async (
  storage: FileStorage | undefined,
  tenantId: string,
  src: string,
): Promise<{ body: Buffer; mime: string } | null> => {
  if (!LAUDO_IMG_SRC.test(src)) return null;
  const [, , compromissoId, , midiaId] = src.split('/');
  return getMidia(storage, tenantId, compromissoId as string, midiaId as string).catch(() => null);
};

export const updateLegenda = async (tenantId: string, compromissoId: string, midiaId: string, legenda: string) => {
  if (!(await vistoriaRepository.updateLegenda(tenantId, compromissoId, midiaId, legenda))) {
    throw new CustomError('not_found', 404);
  }
  return getVistoria(tenantId, compromissoId);
};

// Excluir devolve a cota. Assinatura apagada deixa o `assinaturaId` sem arquivo: quem lê ignora.
export const removeMidia = async (
  storage: FileStorage | undefined,
  tenantId: string,
  compromissoId: string,
  midiaId: string,
): Promise<void> => {
  const files = requireStorage(storage);
  const removida = await vistoriaRepository.removeMidia(tenantId, compromissoId, midiaId);
  if (!removida) throw new CustomError('not_found', 404);
  await files.remove(removida.key);
  await officeService.devolverArquivo(tenantId, removida.bytes);
};

// Registros da perícia (galeria e painel), cada um com o compromisso.
export const listDaPericia = async (tenantId: string, periciaId: string): Promise<VistoriaDoDia[]> => {
  const compromissos = (await compromissoService.listDaPericia(tenantId, periciaId)).reverse();
  const vistorias = await vistoriaRepository.findByCompromissos(
    tenantId,
    compromissos.map((compromisso) => compromisso.id),
  );
  return compromissos.flatMap((compromisso) => {
    const vistoria = vistorias.get(compromisso.id);
    return vistoria ? [{ compromisso, vistoria }] : [];
  });
};

// Laudo (AD-130): a vistoria feita mais recente da perícia que tem registro.
export const ultimaFeitaDaPericia = async (tenantId: string, periciaId: string) =>
  (await listDaPericia(tenantId, periciaId)).find(({ compromisso }) => compromisso.status === 'done');

// Excluir o compromisso leva o registro e as mídias, devolvendo a cota (AD-130).
export const excluirCompromisso = async (storage: FileStorage | undefined, tenantId: string, id: string) => {
  await compromissoService.deleteCompromisso(tenantId, id);
  const midias = await vistoriaRepository.deleteByCompromisso(tenantId, id);
  if (!midias.length) return;
  await Promise.all(midias.map((midia) => storage?.remove(midia.key)));
  await officeService.devolverArquivo(
    tenantId,
    midias.reduce((total, midia) => total + midia.bytes, 0),
  );
};
