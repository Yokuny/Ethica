import * as appointmentService from '../../modules/agenda/appointment.service.js';
import * as calendarEntryService from '../../modules/agenda/calendar-entry.service.js';
import { domainEventBus } from '../event-bus.js';

// Agenda by events (AD-169): the agenda accepts the entries of every origin. The perícia of a case
// is its appointment (AD-160); the rest are all-day entries replaced by origin.
export const registerAgendaSubscriber = (): void => {
  domainEventBus.on('agenda:entries_synced', async ({ tenantId, source, originId, caseId, entries, inspection }) => {
    if (inspection && caseId) await appointmentService.saveCaseInspection(tenantId, caseId, inspection);
    if (source !== 'case') await calendarEntryService.syncOrigin({ tenantId, source, originId, caseId, entries });
  });
  domainEventBus.on('case:deleted', async ({ tenantId, caseId }) => {
    await calendarEntryService.deleteDeadlinesOfCase(tenantId, caseId);
  });
};
