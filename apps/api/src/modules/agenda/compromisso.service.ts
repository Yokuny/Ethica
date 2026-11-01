import { dateInDisplayTz, timeInDisplayTz, wallClockToUtc } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { Geocoder } from '../../providers/geocoder.js';
import type { MailProvider } from '../../providers/mail/index.js';
import * as accountService from '../identity/account.service.js';
import * as officeService from '../identity/office.service.js';
import * as parteService from '../pericia/parte.service.js';
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
  const { date, time, duracaoMinutos, motivo, ...rest } = data;
  if (rest.periciaId) await periciaService.getPericia(tenantId, rest.periciaId);
  const interval = date && time && duracaoMinutos ? toInterval(date, time, duracaoMinutos) : {};
  // Motivo só acompanha o cancelamento (AD-130); voltar a agendado ou concluir o apaga.
  const motivoWrite = rest.status === 'canceled' ? (motivo ?? null) : rest.status ? null : motivo;
  const updated = await compromissoRepository.updateCompromisso(tenantId, id, {
    ...rest,
    ...interval,
    motivo: motivoWrite,
  });
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

export const getCompromisso = async (tenantId: string, id: string): Promise<CompromissoRecord> => {
  const compromisso = await compromissoRepository.findById(tenantId, id);
  if (!compromisso) throw new CompromissoNotFoundError('not_found');
  const [enriched] = await withPericiaNumero(tenantId, [compromisso]);
  return enriched as CompromissoRecord;
};

// Mapa de campo (AD-131): geocodifica o endereço uma vez e guarda no compromisso. Endereço
// não achado devolve o compromisso sem coordenadas; o provedor fora do ar é 503.
export const geocodificar = async (geocoder: Geocoder, tenantId: string, id: string): Promise<CompromissoRecord> => {
  const compromisso = await getCompromisso(tenantId, id);
  if (compromisso.coordenadas || !compromisso.local) return compromisso;
  const endereco = compromisso.local;
  let coordenadas: Awaited<ReturnType<Geocoder['geocode']>>;
  try {
    coordenadas = await geocoder.geocode(endereco);
  } catch (error) {
    throw new CustomError('geocoding_unavailable', 503, error instanceof Error ? error.message : undefined);
  }
  if (!coordenadas) return compromisso;
  await compromissoRepository.setCoordenadas(tenantId, id, { ...coordenadas, endereco });
  return getCompromisso(tenantId, id);
};

const TIPO_EVENTO: Record<CompromissoRecord['tipo'], string> = {
  inspection: 'vistoria',
  hearing: 'audiência',
  meeting: 'reunião',
  other: 'compromisso',
};

const dia = (date: Date): string => dateInDisplayTz(date).split('-').reverse().join('/');

// Aviso de agendamento (AD-131): e-mail a partes e advogados da perícia com e-mail cadastrado,
// pelo modelo do escritório; o envio fica registrado no compromisso. Texto em pt-BR no
// servidor, como o aviso de prazos (exceção da AD-113).
export const enviarAviso = async (
  mail: MailProvider,
  ctx: { tenantId: string; userId: string },
  id: string,
): Promise<CompromissoRecord> => {
  const compromisso = await getCompromisso(ctx.tenantId, id);
  if (!compromisso.periciaId) throw new CustomError('inspection_requires_case', 422);
  const pericia = await periciaService.getPericia(ctx.tenantId, compromisso.periciaId);
  const partes = await parteService.findByIds(
    ctx.tenantId,
    pericia.partes.map((parte) => parte.parteId),
  );
  const emails = [...new Set(partes.flatMap((parte) => (parte.email ? [parte.email] : [])))];
  if (!emails.length) throw new CustomError('no_recipients', 422);
  const [modelo, perito] = await Promise.all([
    officeService.getAvisoAgendamento(ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
  ]);
  const valores: Record<string, string> = {
    '[TIPO_EVENTO]': TIPO_EVENTO[compromisso.tipo],
    '[DATA]': dia(compromisso.inicio),
    '[HORA]': timeInDisplayTz(compromisso.inicio),
    '[ENDERECO]': compromisso.local ?? '',
    '[NUMERO_PROCESSO]': pericia.numeroProcesso,
    '[NOME_PERITO]': perito.name,
    '[VARA]': pericia.vara ?? '',
    '[COMARCA]': pericia.comarca ?? '',
  };
  const preencher = (texto: string) =>
    Object.entries(valores).reduce((resultado, [marcador, valor]) => resultado.replaceAll(marcador, valor), texto);
  const assunto = preencher(modelo.assunto);
  const corpo = preencher(modelo.corpo);
  const enviados: string[] = [];
  for (const email of emails) {
    if ((await mail.send(email, assunto, corpo)).sent) enviados.push(email);
  }
  if (!enviados.length) throw new CustomError('invite_email_failed', 502);
  await compromissoRepository.addAviso(ctx.tenantId, id, { userId: ctx.userId, destinatarios: enviados });
  return getCompromisso(ctx.tenantId, id);
};

export const listDaPericia = (tenantId: string, periciaId: string) =>
  compromissoRepository.listAll(tenantId, { periciaId });
export const listForExport = (tenantId: string) => compromissoRepository.listAll(tenantId);
