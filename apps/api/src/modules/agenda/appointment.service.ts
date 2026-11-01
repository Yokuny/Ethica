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

// Wall-clock date/time + duration -> UTC range (AD-036, AD-103).
const toInterval = (date: string, time: string, durationMinutes: number) => {
  const start = wallClockToUtc(date, time);
  return { start, end: new Date(start.getTime() + durationMinutes * 60_000) };
};

const withCaseNumber = async (tenantId: string, items: AppointmentRecord[]): Promise<AppointmentRecord[]> => {
  const ids = [...new Set(items.flatMap((item) => (item.caseId ? [item.caseId] : [])))];
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return items.map((item) => {
    const number = item.caseId ? summaries.get(item.caseId)?.processNumber : undefined;
    return number ? { ...item, caseNumber: number } : item;
  });
};

export const createAppointment = async (tenantId: string, data: CreateAppointment): Promise<AppointmentRecord> => {
  const { date, time, durationMinutes, ...rest } = data;
  if (rest.caseId) await caseService.getCase(tenantId, rest.caseId);
  return appointmentRepository.createAppointment(tenantId, { ...rest, ...toInterval(date, time, durationMinutes) });
};

// Rescheduling requires date, time and duration together: the whole range is recalculated.
export const updateAppointment = async (
  tenantId: string,
  id: string,
  data: UpdateAppointment,
): Promise<AppointmentRecord> => {
  const { date, time, durationMinutes, reason, ...rest } = data;
  if (rest.caseId) await caseService.getCase(tenantId, rest.caseId);
  const interval = date && time && durationMinutes ? toInterval(date, time, durationMinutes) : {};
  // The reason only goes with a cancellation (AD-130); going back to scheduled or completing clears it.
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
      type: query.type,
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

// Field map (AD-131): geocodes the address once and stores it on the appointment. An address
// not found returns the appointment without coordinates; the provider being down is 503.
export const geocode = async (geocoder: Geocoder, tenantId: string, id: string): Promise<AppointmentRecord> => {
  const appointment = await getAppointment(tenantId, id);
  if (appointment.coordinates || !appointment.location) return appointment;
  const address = appointment.location;
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

const TYPE_EVENT: Record<AppointmentRecord['type'], string> = {
  inspection: 'inspection',
  hearing: 'audiência',
  meeting: 'reunião',
  other: 'appointment',
};

const day = (date: Date): string => dateInDisplayTz(date).split('-').reverse().join('/');

// Schedule notice (AD-131): e-mail to the case parties and lawyers with a registered e-mail,
// using the office template; the sending is recorded on the appointment. Text in pt-BR on the
// server, like the deadline reminder (AD-113 exception).
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
  const [template, expert] = await Promise.all([
    officeService.getScheduleNotice(ctx.tenantId),
    accountService.getProfile(ctx.tenantId, ctx.userId),
  ]);
  const values: Record<string, string> = {
    '[TIPO_EVENTO]': TYPE_EVENT[appointment.type],
    '[DATA]': day(appointment.start),
    '[HORA]': timeInDisplayTz(appointment.start),
    '[ENDERECO]': appointment.location ?? '',
    '[NUMERO_PROCESSO]': legalCase.processNumber,
    '[NOME_PERITO]': expert.name,
    '[VARA]': legalCase.division ?? '',
    '[COMARCA]': legalCase.district ?? '',
  };
  const fill = (text: string) =>
    Object.entries(values).reduce((result, [marker, amount]) => result.replaceAll(marker, amount), text);
  const subject = fill(template.subject);
  const body = fill(template.body);
  const sent: string[] = [];
  for (const email of emails) {
    if ((await mail.send(email, subject, body)).sent) sent.push(email);
  }
  if (!sent.length) throw new CustomError('invite_email_failed', 502);
  await appointmentRepository.addNotice(ctx.tenantId, id, { userId: ctx.userId, recipients: sent });
  return getAppointment(ctx.tenantId, id);
};

export const listByCase = (tenantId: string, caseId: string) => appointmentRepository.listAll(tenantId, { caseId });
export const listForExport = (tenantId: string) => appointmentRepository.listAll(tenantId);
