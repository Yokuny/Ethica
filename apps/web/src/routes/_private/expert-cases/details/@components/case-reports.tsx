import { reportRoleType } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FileSignature } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { REPORT_STATUS_VARIANT, reportStatusLabel } from '@/components/report-labels.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseRecord } from '@/query/case.js';
import { reportsQuery } from '@/query/report.js';

// Laudos (ou pareceres, LAU-06) da perícia, com atalho para iniciar um novo.
export function CaseReports({ legalCase }: { legalCase: CaseRecord }) {
  const query = useQuery(reportsQuery({ caseId: legalCase.id, limit: 20 }));
  const tipo = reportRoleType(legalCase.role);

  return (
    <Panel
      size="sm"
      title={t(tipo === 'technical_opinion' ? 'technical_opinions' : 'expert_reports')}
      actions={
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link to="/expert-reports/add" search={{ caseId: legalCase.id }}>
              {t(tipo === 'technical_opinion' ? 'start_technical_opinion' : 'start_report')}
            </Link>
          }
        />
      }
    >
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.items.length ? (
        <DefaultEmptyData title={t('no_reports_yet')} />
      ) : (
        <LinkList>
          {query.data.items.map((report) => (
            <LinkListItem
              key={report.id}
              icon={FileSignature}
              render={<Link to="/expert-reports/details" search={{ id: report.id }} />}
              title={report.templateName}
              badges={<Badge variant={REPORT_STATUS_VARIANT[report.status]}>{reportStatusLabel(report.status)}</Badge>}
              description={`${t('updated_on')} ${formatDate(report.updatedAt)}`}
            />
          ))}
        </LinkList>
      )}
    </Panel>
  );
}
