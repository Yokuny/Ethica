import type { AppointmentReason, AppointmentStatus, InspectionData, MediaType } from '@ethica/contracts';
import { clear, del, get, keys, set } from 'idb-keyval';
import type { DayInspection, InspectionRecord } from '@/query/inspection.js';

// O que a tela de campo guarda no aparelho (AD-128), no IndexedDB:
// - `dia:<data>` e `registro:<compromisso>`: a última cópia vinda da API, para abrir sem conexão;
// - `rascunho:<compromisso>`: o formulário alterado e ainda não enviado (com a versão de base);
// - `midia:<id>`: foto, áudio ou assinatura ainda não enviados, com o arquivo;
// - `status:<compromisso>`: feita/adiada/ausente marcados sem conexão.
export type Draft = {
  appointmentId: string;
  versao: number;
  dados: InspectionData;
  alteradoEm: string;
  // Versão do servidor quando o envio deu 409: o perito escolhe qual fica.
  conflict?: InspectionRecord;
};
export type PendingMedia = {
  appointmentId: string;
  mediaId: string;
  tipo: MediaType;
  caption?: string;
  mime: string;
  blob: Blob;
  criadoEm: string;
  falha?: string;
};
export type StatusPending = { appointmentId: string; status: AppointmentStatus; reason?: AppointmentReason };

const comPrefixo = async <T>(prefixo: string): Promise<T[]> => {
  const todas = (await keys()).filter((key): key is string => typeof key === 'string' && key.startsWith(prefixo));
  return (await Promise.all(todas.map((key) => get<T>(key)))).filter((item): item is Awaited<T> =>
    Boolean(item),
  ) as T[];
};

export const saveDay = async (date: string, itens: DayInspection[]) => {
  await set(`day:${date}`, itens);
  await Promise.all(itens.map((item) => set(`registro:${item.appointment.id}`, item)));
};
export const readDay = (date: string) => get<DayInspection[]>(`day:${date}`);
export const lerRegistro = (appointmentId: string) => get<DayInspection>(`registro:${appointmentId}`);
export const salvarRegistro = async (item: DayInspection) => set(`registro:${item.appointment.id}`, item);

export const readDraft = (appointmentId: string) => get<Draft>(`draft:${appointmentId}`);
export const saveDraft = (draft: Draft) => set(`draft:${draft.appointmentId}`, draft);
export const deleteDraft = (appointmentId: string) => del(`draft:${appointmentId}`);
export const listDrafts = () => comPrefixo<Draft>('draft:');

export const storeMedia = (media: PendingMedia) => set(`media:${media.mediaId}`, media);
export const deleteMedia = (mediaId: string) => del(`media:${mediaId}`);
export const listMedia = () => comPrefixo<PendingMedia>('media:');

export const guardarStatus = (status: StatusPending) => set(`status:${status.appointmentId}`, status);
export const apagarStatus = (appointmentId: string) => del(`status:${appointmentId}`);
export const listarStatus = () => comPrefixo<StatusPending>('status:');

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
export const clearDevice = async (): Promise<void> => {
  try {
    await clear();
  } catch {
    // Sem IndexedDB não há o que apagar.
  }
};
