import { isModeloPadrao, type LaudoTipo } from '@ethica/contracts';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import { MODELOS_PADRAO } from './laudo.biblioteca.js';
import { sanitizeLaudoHtml } from './laudo.html.js';
import type {
  CreateModeloLaudo,
  ModeloLaudoRecord,
  ModeloLaudoResumo,
  ModeloSecao,
  MoverSecao,
} from './laudo.schema.js';
import * as modeloLaudoRepository from './modeloLaudo.repository.js';

export class ModeloLaudoNotFoundError extends KeyedError {}

const PADROES = Object.values(MODELOS_PADRAO);

// Modelo padrão é só leitura (AD-126): o escritório clona para adaptar.
const doEscritorio = (id: string): void => {
  if (isModeloPadrao(id)) throw new CustomError('standard_template_read_only', 403);
};

const encontrado = (modelo: ModeloLaudoRecord | null): ModeloLaudoRecord => {
  if (!modelo) throw new ModeloLaudoNotFoundError('not_found');
  return modelo;
};

const saneada = (secao: ModeloSecao): ModeloSecao => ({
  ...secao,
  textoSim: sanitizeLaudoHtml(secao.textoSim),
  textoNao: sanitizeLaudoHtml(secao.textoNao),
});

export const listModelos = async (tenantId: string, tipo?: LaudoTipo): Promise<ModeloLaudoResumo[]> => [
  ...PADROES.filter((modelo) => !tipo || modelo.tipo === tipo).map(({ secoes, ...modelo }) => ({
    ...modelo,
    totalSecoes: secoes.length,
  })),
  ...(await modeloLaudoRepository.list(tenantId, tipo)),
];

export const getModelo = async (tenantId: string, id: string): Promise<ModeloLaudoRecord> =>
  PADROES.find((modelo) => modelo.id === id) ?? encontrado(await modeloLaudoRepository.findById(tenantId, id));

// Em branco ou clonando outro modelo do mesmo tipo (LAU-01).
export const createModelo = async (tenantId: string, data: CreateModeloLaudo): Promise<ModeloLaudoRecord> => {
  const base = data.baseId ? await getModelo(tenantId, data.baseId) : undefined;
  if (base && base.tipo !== data.tipo) throw new CustomError('report_template_type_mismatch', 422);
  return modeloLaudoRepository.create(tenantId, {
    nome: data.nome,
    tipo: data.tipo,
    secoes: (base?.secoes ?? []).map(({ id: _id, ...secao }) => secao),
  });
};

export const renameModelo = async (tenantId: string, id: string, nome: string): Promise<ModeloLaudoRecord> => {
  doEscritorio(id);
  return encontrado(await modeloLaudoRepository.updateNome(tenantId, id, nome));
};

export const deleteModelo = async (tenantId: string, id: string): Promise<void> => {
  doEscritorio(id);
  const { deletedCount } = await modeloLaudoRepository.remove(tenantId, id);
  if (deletedCount === 0) throw new ModeloLaudoNotFoundError('not_found');
};

export const addSecao = async (tenantId: string, id: string, secao: ModeloSecao): Promise<ModeloLaudoRecord> => {
  doEscritorio(id);
  return encontrado(await modeloLaudoRepository.addSecao(tenantId, id, saneada(secao)));
};

export const updateSecao = async (
  tenantId: string,
  id: string,
  secaoId: string,
  secao: ModeloSecao,
): Promise<ModeloLaudoRecord> => {
  doEscritorio(id);
  return encontrado(await modeloLaudoRepository.updateSecao(tenantId, id, secaoId, saneada(secao)));
};

export const removeSecao = async (tenantId: string, id: string, secaoId: string): Promise<ModeloLaudoRecord> => {
  doEscritorio(id);
  return encontrado(await modeloLaudoRepository.removeSecao(tenantId, id, secaoId));
};

// Sobe ou desce uma posição; nas pontas não muda nada.
export const moverSecao = async (
  tenantId: string,
  id: string,
  secaoId: string,
  { direcao }: MoverSecao,
): Promise<ModeloLaudoRecord> => {
  doEscritorio(id);
  const modelo = encontrado(await modeloLaudoRepository.findById(tenantId, id));
  const de = modelo.secoes.findIndex((secao) => secao.id === secaoId);
  if (de < 0) throw new ModeloLaudoNotFoundError('not_found');
  const para = direcao === 'up' ? de - 1 : de + 1;
  if (para < 0 || para >= modelo.secoes.length) return modelo;
  const secoes = [...modelo.secoes];
  [secoes[de], secoes[para]] = [secoes[para] as (typeof secoes)[number], secoes[de] as (typeof secoes)[number]];
  return encontrado(await modeloLaudoRepository.setSecoes(tenantId, id, secoes));
};
