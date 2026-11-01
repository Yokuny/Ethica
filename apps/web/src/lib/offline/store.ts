import type { CompromissoMotivo, CompromissoStatus, MidiaTipo, VistoriaDados } from '@ethica/contracts';
import { clear, del, get, keys, set } from 'idb-keyval';
import type { VistoriaDoDia, VistoriaRecord } from '@/query/vistoria.js';

// O que a tela de campo guarda no aparelho (AD-128), no IndexedDB:
// - `dia:<data>` e `registro:<compromisso>`: a última cópia vinda da API, para abrir sem conexão;
// - `rascunho:<compromisso>`: o formulário alterado e ainda não enviado (com a versão de base);
// - `midia:<id>`: foto, áudio ou assinatura ainda não enviados, com o arquivo;
// - `status:<compromisso>`: feita/adiada/ausente marcados sem conexão.
export type Rascunho = {
  compromissoId: string;
  versao: number;
  dados: VistoriaDados;
  alteradoEm: string;
  // Versão do servidor quando o envio deu 409: o perito escolhe qual fica.
  conflito?: VistoriaRecord;
};
export type MidiaPendente = {
  compromissoId: string;
  midiaId: string;
  tipo: MidiaTipo;
  legenda?: string;
  mime: string;
  blob: Blob;
  criadoEm: string;
  falha?: string;
};
export type StatusPendente = { compromissoId: string; status: CompromissoStatus; motivo?: CompromissoMotivo };

const comPrefixo = async <T>(prefixo: string): Promise<T[]> => {
  const todas = (await keys()).filter((key): key is string => typeof key === 'string' && key.startsWith(prefixo));
  return (await Promise.all(todas.map((key) => get<T>(key)))).filter((item): item is Awaited<T> =>
    Boolean(item),
  ) as T[];
};

export const salvarDia = async (date: string, itens: VistoriaDoDia[]) => {
  await set(`dia:${date}`, itens);
  await Promise.all(itens.map((item) => set(`registro:${item.compromisso.id}`, item)));
};
export const lerDia = (date: string) => get<VistoriaDoDia[]>(`dia:${date}`);
export const lerRegistro = (compromissoId: string) => get<VistoriaDoDia>(`registro:${compromissoId}`);
export const salvarRegistro = async (item: VistoriaDoDia) => set(`registro:${item.compromisso.id}`, item);

export const lerRascunho = (compromissoId: string) => get<Rascunho>(`rascunho:${compromissoId}`);
export const salvarRascunho = (rascunho: Rascunho) => set(`rascunho:${rascunho.compromissoId}`, rascunho);
export const apagarRascunho = (compromissoId: string) => del(`rascunho:${compromissoId}`);
export const listarRascunhos = () => comPrefixo<Rascunho>('rascunho:');

export const guardarMidia = (midia: MidiaPendente) => set(`midia:${midia.midiaId}`, midia);
export const apagarMidia = (midiaId: string) => del(`midia:${midiaId}`);
export const listarMidias = () => comPrefixo<MidiaPendente>('midia:');

export const guardarStatus = (status: StatusPendente) => set(`status:${status.compromissoId}`, status);
export const apagarStatus = (compromissoId: string) => del(`status:${compromissoId}`);
export const listarStatus = () => comPrefixo<StatusPendente>('status:');

// Sessão (AD-128): a última vista com conexão, para o app abrir sem rede. Só nome, papel e
// escritório; a credencial continua no cookie httpOnly. Sem IndexedDB (testes), não guarda.
export const salvarSessao = async (sessao: unknown): Promise<void> => {
  try {
    await set('sessao', sessao);
  } catch {
    // Sem IndexedDB: o app só não abre sem conexão.
  }
};
export const lerSessao = async <T>(): Promise<T | undefined> => {
  try {
    return await get<T>('sessao');
  } catch {
    return undefined;
  }
};

// Sair apaga tudo o que o aparelho guardou do escritório (rota, rascunhos, fila, sessão).
export const limparAparelho = async (): Promise<void> => {
  try {
    await clear();
  } catch {
    // Sem IndexedDB não há o que apagar.
  }
};
