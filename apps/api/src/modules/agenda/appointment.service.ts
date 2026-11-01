import { dateInDisplayTz, timeInDisplayTz, wallClockToUtc } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { Geocoder } from '../../providers/geocoder.js';
import type { MailProvider } from '../../providers/mail/index.js';
import * as caseService from '../case/case.service.js';
import * as partyService from '../case/party.service.js';
import * as accountService from '../identity/account.service.js';
import * as officeService from '../identity/office.service.js';
import * as appointmentRepository from './appointment.repository.js';
import type {
  AppointmentRecord,
  CreateAppointment,
  ListAppointmentsQuery,
  UpcomingAppointmentsQuery,
  UpdateAppointment,
} from './appointment.schema.js';

export class AppointmentNotFoundError extends KeyedError {}

// Data/hora de parede + duração -> intervalo em UTC (AD-036, AD-103).
const toInterval = (date: string, time: string, durationMinutes: number) => {
  const inicio = wallClockToUtc(date, time);
  return { inicio, fim: new Date(inicio.getTime() + durationMinutes * 60_000) };
};

const withCaseNumber = async (tenantId: string, items: AppointmentRecord[]): Promise<AppointmentRecord[]> => {
  const ids = [...new Set(items.flatMap((item) => (item.caseId ? [item.caseId] : [])))];
  const resumos = await caseService.findResumosByIds(tenantId, ids);
  return items.map((item) => {
    const numero = item.caseId ? resumos.get(item.caseId)?.processNumber : undefined;
    return numero ? { ...item, caseNumber: numero } : item;
  });
};

export const createAppointment = async (tenantId: string, data: CreateAppointment): Promise<AppointmentRecord> => {
  const { date, time, durationMinutes, ...rest } = data;
  if (rest.caseId) await caseService.getCase(tenantId, rest.caseId);
  return appointmentRepository.createAppointment(tenantId, { ...rest, ...toInterval(date, time, durationMinutes) });
};

// Remarcar exige data, hora e duração juntas: o intervalo é recalculado inteiro.
export const updateAppointment = async (
  tenantId: string,
  id: string,
  data: UpdateAppointment,
): Promise<AppointmentRecord> => {
  const { date, time, durationMinutes, reason, ...rest } = data;
  if (rest.caseId) await caseService.getCase(tenantId, rest.caseId);
  const interval = date && time && durationMinutes ? toInterval(date, time, durationMinutes) : {};
  // Motivo só acompanha o cancelamento (AD-130); voltar a agendado ou concluir o apaga.
  const reasonWrite = rest.status === 'canceled' ? (reason ?? null) : rest.status ? null : reason;
  const updated = await appointmentRepository.updateAppointment(tenantId, id, {
    ...rest,
    ...interval,
    reason: reasonWrite,
  });
  if (!updated) throw new AppointmentNotFoundError('not_found');
  const [enriched] = await withCaseNumber(tenantId, [updated]);
  return enriched as AppointmentRecord;
};

export const deleteAppointment = async (tenantId: string, id: string): Promise<void> => {
  const { deletedCount } = await appointmentRepository.deleteAppointment(tenantId, id);
  if (deletedCount === 0) throw new AppointmentNotFoundError('not_found');
};

export const listAppointments = async (tenantId: string, query: ListAppointmentsQuery) =>
  withCaseNumber(
    tenantId,
    await appointmentRepository.listInRange(tenantId, {
      from: wallClockToUtc(query.from, '00:00'),
      to: wallClockToUtc(query.to, '00:00'),
      tipo: query.tipo,
      caseId: query.caseId,
    }),
  );

export const listUpcoming = async (tenantId: string, query: UpcomingAppointmentsQuery, now: Date = new Date()) =>
  withCaseNumber(tenantId, await appointmentRepository.listUpcoming(tenantId, { now, ...query }));

export const getAppointment = async (tenantId: string, id: string): Promise<AppointmentRecord> => {
  const appointment = await appointmentRepository.findById(tenantId, id);
  if (!appointment) throw new AppointmentNotFoundError('not_found');
  const [enriched] = await withCaseNumber(tenantId, [appointment]);
  return enriched as AppointmentRecord;
};

// Mapa de campo (AD-131): geocodifica o endereço uma vez e guarda no compromisso. Endereço
// não achado devolve o compromisso sem coordenadas; o provedor fora do ar é 503.
export const geocode = async (geocoder: Geocoder, tenantId: string, id: string): Promise<AppointmentRecord> => {
  const appointment = await getAppointment(tenantId, id);
  if (appointment.coordinates || !appointment.local) return appointment;
  const address = appointment.local;
  let coordinates: Awaited<ReturnType<Geocoder['geocode']>>;
  try {
    coordinates = await geocoder.geocode(address);
  } catch (error) {
    throw new CustomError('geocoding_unavailable', 503, error instanceof Error ? error.message : undefined);
  }
  if (!coordinates) return appointment;
  await appointmentRepository.setCoordinates(tenantId, id, { ...coordinates, address });
  return getAppointment(tenantId, id);
};

const TYPE_EVENT: Record<AppointmentRecord['tipo'], string> = {
  inspection: 'inspection',
  hearing: 'audiência',
  meeting: 'reunião',
  other: 'appointment',
};

const day = (date: Date): string => dateInDisplayTz(date).split('-').reverse().join('/');

// Aviso de agendamento (AD-131): e-mail a partes e advogados da perícia com e-mail cadastrado,
// pelo modelo do escritório; o envio fica registrado no compromisso. Texto em pt-BR no
// servidor, como o aviso de prazos (exceção da AD-113).
export const sendNotice = async (
  mail: MailProvider,
  ctx: { tenantId: string; userId: string },
  id: string,
): Promise<AppointmentRecord> => {
  const appointment = await getAppointment(ctx.tenantId, id);
  if (!appointment.caseId) throw new CustomError('inspection_requires_case', 422);
  const legalCase = await caseService.getCase(ctx.tenantId, appointment.caseId);
  const parties = await partyService.findByIds(
    ctx.tenantId,
    legalCase.parties.map((party) => party.partyId),
  );
  const emails = [...new Set(parties.flatMap((party) => (party.email ? [party.email] : [])))];
  if (!emails.length) throw new CustomError('no_recipients', 422);
  const [modelo, expert] = await Promise.all([
    officeService.getScheduleNotice(ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
  ]);
  const valores: Record<string, string> = {
    '[TIPO_EVENTO]': TYPE_EVENT[appointment.tipo],
    '[DATA]': day(appointment.inicio),
    '[HORA]': timeInDisplayTz(appointment.inicio),
    '[ENDERECO]': appointment.local ?? '',
    '[NUMERO_PROCESSO]': legalCase.processNumber,
    '[NOME_PERITO]': expert.name,
    '[VARA]': legalCase.division ?? '',
    '[COMARCA]': legalCase.district ?? '',
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
  await appointmentRepository.addNotice(ctx.tenantId, id, { userId: ctx.userId, recipients: enviados });
  return getAppointment(ctx.tenantId, id);
};

export const listByCase = (tenantId: string, caseId: string) => appointmentRepository.listAll(tenantId, { caseId });
export const listForExport = (tenantId: string) => appointmentRepository.listAll(tenantId);
