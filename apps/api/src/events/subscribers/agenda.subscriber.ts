import * as appointmentService from '../../modules/agenda/appointment.service.js';
import { domainEventBus } from '../event-bus.js';

// Perícia date given at registration (AD-160): a one-hour inspection appointment linked to the case.
export const registerAgendaSubscriber = (): void => {
  domainEventBus.on('case:inspection_scheduled', async ({ tenantId, caseId, caseLabel, date, time, location }) => {
    await appointmentService.createAppointment(tenantId, {
      type: 'inspection',
      title: `Perícia — ${caseLabel}`,
      date,
      time,
      durationMinutes: 60,
      location,
      caseId,
    });
  });
};
