import type { AppointmentReason, AppointmentStatus, InspectionData, MediaType } from '@ethica/contracts';
import { clear, del, get, keys, set } from 'idb-keyval';
import type { DayInspection, InspectionRecord } from '@/query/inspection.js';

// What the field screen keeps on the device (AD-128), in IndexedDB:
// - `day:<date>` and `record:<appointment>`: the last copy from the API, to open without a connection;
// - `draft:<appointment>`: the changed form not yet sent (with the base version);
// - `media:<id>`: photo, audio or signature not yet sent, with the file;
// - `status:<appointment>`: done/postponed/absent marked without a connection.
export type Draft = {
  appointmentId: string;
  version: number;
  data: InspectionData;
  changedAt: string;
  // Server version when sending got a 409: the expert picks which one stays.
  conflict?: InspectionRecord;
};
export type PendingMedia = {
  appointmentId: string;
  mediaId: string;
  type: MediaType;
  caption?: string;
  mime: string;
  blob: Blob;
  createdAt: string;
  failure?: string;
};
export type StatusPending = { appointmentId: string; status: AppointmentStatus; reason?: AppointmentReason };

const withPrefix = async <T>(prefix: string): Promise<T[]> => {
  const all = (await keys()).filter((key): key is string => typeof key === 'string' && key.startsWith(prefix));
  return (await Promise.all(all.map((key) => get<T>(key)))).filter((item): item is Awaited<T> => Boolean(item)) as T[];
};

export const saveDay = async (date: string, items: DayInspection[]) => {
  await set(`day:${date}`, items);
  await Promise.all(items.map((item) => set(`record:${item.appointment.id}`, item)));
};
export const readDay = (date: string) => get<DayInspection[]>(`day:${date}`);
export const readRecord = (appointmentId: string) => get<DayInspection>(`record:${appointmentId}`);
export const saveRecord = async (item: DayInspection) => set(`record:${item.appointment.id}`, item);

export const readDraft = (appointmentId: string) => get<Draft>(`draft:${appointmentId}`);
export const saveDraft = (draft: Draft) => set(`draft:${draft.appointmentId}`, draft);
export const deleteDraft = (appointmentId: string) => del(`draft:${appointmentId}`);
export const listDrafts = () => withPrefix<Draft>('draft:');

export const storeMedia = (media: PendingMedia) => set(`media:${media.mediaId}`, media);
export const deleteMedia = (mediaId: string) => del(`media:${mediaId}`);
export const listMedia = () => withPrefix<PendingMedia>('media:');

export const storeStatus = (status: StatusPending) => set(`status:${status.appointmentId}`, status);
export const deleteStatus = (appointmentId: string) => del(`status:${appointmentId}`);
export const listStatus = () => withPrefix<StatusPending>('status:');

// Session (AD-128): the last one seen with a connection, so the app opens without network. Only name, role and
// office; the credential stays in the httpOnly cookie. Without IndexedDB (tests), it does not store.
export const saveSession = async (session: unknown): Promise<void> => {
  try {
    await set('session', session);
  } catch {
    // Without IndexedDB: the app just does not open without a connection.
  }
};
export const readSession = async <T>(): Promise<T | undefined> => {
  try {
    return await get<T>('session');
  } catch {
    return undefined;
  }
};

// Signing out deletes everything the device kept from the office (route, drafts, queue, session).
export const clearDevice = async (): Promise<void> => {
  try {
    await clear();
  } catch {
    // Without IndexedDB there is nothing to delete.
  }
};
