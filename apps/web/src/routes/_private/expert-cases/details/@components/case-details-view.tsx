import { CASE_IDLE_STATUSES, caseLabel } from '@ethica/contracts';
import { FileText, Scale, Users } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { CASE_STATUS_VARIANT, caseStatusLabel, serviceTypeLabel } from '@/components/case-labels.js';
import { sideLabel } from '@/components/party-labels.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { RecordHeader, RecordHeading, RecordStat, RecordStats, RecordStatus } from '@/components/record.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseRecord } from '@/query/case.js';

const day = (value?: string) => (value ? formatDate(new Date(`${value}T12:00:00`)) : '-');
const money = (value?: number) => (value ? formatMoney(value) : '-');

// Record page: header with process and status, strip with deadlines and
// fees, and the read groups (court, parties, notes).
export function CaseDetailsView({ legalCase, canSeeFinance }: { legalCase: CaseRecord; canSeeFinance: boolean }) {
  const client = legalCase.parties.find((party) => party.client)?.name;
  return (
    <div className="grid gap-6">
      <RecordHeader>
        <RecordHeading
          icon={<Scale />}
          label={serviceTypeLabel(legalCase)}
          title={caseLabel(legalCase)}
          description={legalCase.subject}
        />
        <RecordStatus
          variant={CASE_STATUS_VARIANT[legalCase.status]}
          label={caseStatusLabel(legalCase.status)}
          pulse={!CASE_IDLE_STATUSES.includes(legalCase.status)}
        />
      </RecordHeader>
      <RecordStats>
        {legalCase.serviceOrder && <RecordStat label={t('service_order')} value={legalCase.serviceOrder} />}
        <RecordStat label={t('appointment_date')} value={day(legalCase.nominationDate)} />
        {client && <RecordStat label={t('contracting_party')} value={client} />}
        {/* Amounts only for whoever sees finance (AD-137). */}
        {canSeeFinance && <RecordStat label={t('proposed_fees')} value={money(legalCase.proposedFeesCents)} />}
        {canSeeFinance && (
          <RecordStat
            label={legalCase.role === 'technical_assistant' ? t('contracted_fees') : t('fixed_fees')}
            value={money(legalCase.fixedFeesCents)}
          />
        )}
      </RecordStats>
      <ProductSpecs
        groups={[
          {
            id: 'juizo',
            name: t('court_header'),
            icon: <Scale />,
            specs: [
              { label: t('service_type'), value: serviceTypeLabel(legalCase) },
              { label: t('role_in_case'), value: t(legalCase.role) },
              { label: t('court'), value: legalCase.court || '-' },
              { label: t('court_division'), value: legalCase.division || '-' },
              { label: t('judicial_district'), value: legalCase.district || '-' },
            ],
          },
          {
            id: 'parties',
            name: t('parties'),
            icon: <Users />,
            specs: legalCase.parties.length
              ? legalCase.parties.map((party) => ({
                  label: [
                    sideLabel(party.side, legalCase.courtType),
                    t(party.type),
                    party.client ? t('contracting_party') : '',
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  value: (
                    <AppLink to="/parties/details" search={{ id: party.partyId }}>
                      {party.name}
                    </AppLink>
                  ),
                }))
              : [{ label: t('parties'), value: '-' }],
          },
          {
            id: 'notes',
            name: t('notes'),
            icon: <FileText />,
            specs: [{ label: t('notes'), value: legalCase.notes || '-' }],
          },
        ]}
      />
    </div>
  );
}
