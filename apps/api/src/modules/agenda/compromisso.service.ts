import { wallClockToUtc } from '@ethica/db';
import { KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as periciaService from '../pericia/pericia.service.js';
import * as compromissoRepository from './compromisso.repository.js';
import type {
  CompromissoRecord,
  CreateCompromisso,
  ListCompromissosQuery,
  UpcomingCompromissosQuery,
  UpdateCompromisso,
} from './compromisso.schema.js';

export class CompromissoNotFoundError extends KeyedError {}

// Data/hora de parede + duração -> intervalo em UTC (AD-036, AD-103).
const toInterval = (date: string, time: string, duracaoMinutos: number) => {
  const inicio = wallClockToUtc(date, time);
  return { inicio, fim: new Date(inicio.getTime() + duracaoMinutos * 60_000) };
};

const withPericiaNumero = async (tenantId: string, items: CompromissoRecord[]): Promise<CompromissoRecord[]> => {
  const ids = [...new Set(items.flatMap((item) => (item.periciaId ? [item.periciaId] : [])))];
  const resumos = await periciaService.findResumosByIds(tenantId, ids);
  return items.map((item) => {
    const numero = item.periciaId ? resumos.get(item.periciaId)?.numeroProcesso : undefined;
    return numero ? { ...item, periciaNumero: numero } : item;
  });
};

export const createCompromisso = async (tenantId: string, data: CreateCompromisso): Promise<CompromissoRecord> => {
  const { date, time, duracaoMinutos, ...rest } = data;
  if (rest.periciaId) await periciaService.getPericia(tenantId, rest.periciaId);
  return compromissoRepository.createCompromisso(tenantId, { ...rest, ...toInterval(date, time, duracaoMinutos) });
};

// Remarcar exige data, hora e duração juntas: o intervalo é recalculado inteiro.
export const updateCompromisso = async (
  tenantId: string,
  id: string,
  data: UpdateCompromisso,
): Promise<CompromissoRecord> => {
  const { date, time, duracaoMinutos, ...rest } = data;
  if (rest.periciaId) await periciaService.getPericia(tenantId, rest.periciaId);
  const interval = date && time && duracaoMinutos ? toInterval(date, time, duracaoMinutos) : {};
  const updated = await compromissoRepository.updateCompromisso(tenantId, id, { ...rest, ...interval });
  if (!updated) throw new CompromissoNotFoundError('not_found');
  const [enriched] = await withPericiaNumero(tenantId, [updated]);
  return enriched as CompromissoRecord;
};

export const deleteCompromisso = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await compromissoRepository.deleteCompromisso(tenantId, id);
  if (deletedCount === 0) throw new CompromissoNotFoundError('not_found');
};

export const listCompromissos = async (tenantId: string, query: ListCompromissosQuery) =>
  withPericiaNumero(
    tenantId,
    await compromissoRepository.listInRange(tenantId, {
      from: wallClockToUtc(query.from, '00:00'),
      to: wallClockToUtc(query.to, '00:00'),
      tipo: query.tipo,
      periciaId: query.periciaId,
    }),
  );

export const listUpcoming = async (tenantId: string, query: UpcomingCompromissosQuery, now: Date = new Date()) =>
  withPericiaNumero(tenantId, await compromissoRepository.listUpcoming(tenantId, { now, ...query }));

export const listDaPericia = (tenantId: string, periciaId: string) =>
  compromissoRepository.listAll(tenantId, { periciaId });
export const listForExport = (tenantId: string) => compromissoRepository.listAll(tenantId);
