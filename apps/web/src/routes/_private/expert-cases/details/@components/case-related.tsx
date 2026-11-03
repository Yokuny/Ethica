import { useQuery } from '@tanstack/react-query';
import { AppLink } from '@/components/app-link.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Panel } from '@/components/panel.js';
import { UpcomingAppointments } from '@/components/upcoming-appointments.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { upcomingAppointmentsQuery } from '@/query/appointment.js';

// Upcoming appointments of the case; its money is in CaseFinance.
export function CaseRelated({ caseId }: { caseId: string }) {
  const appointments = useQuery(upcomingAppointmentsQuery({ limit: 10, caseId }));

  return (
    <Panel size="sm" title={t('upcoming_commitments')} actions={<AppLink to="/agenda">{t('open_agenda')}</AppLink>}>
      {appointments.isLoading ? (
        <DefaultLoading />
      ) : !appointments.data?.length ? (
        <DefaultEmptyData title={t('nothing_scheduled')} />
      ) : (
        <UpcomingAppointments items={appointments.data} />
      )}
    </Panel>
  );
}
