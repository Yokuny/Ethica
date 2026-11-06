import { caseLabel, isCaseClosed, usesContractor } from '@ethica/contracts';
import { ItemTitle } from '@ethica/ui/components/item';
import { ArrowUpRight, Building2, FileText, Scale, Users } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import {
  CASE_STATUS_VARIANT,
  casePhaseLabel,
  caseRoleLabel,
  caseStatusLabel,
  courtTypeLabel,
  serviceLabel,
  serviceTypeLabel,
} from '@/components/case-labels.js';
import { sideLabel } from '@/components/party-labels.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { RecordHeader, RecordHeading, RecordStat, RecordStats, RecordStatus } from '@/components/record.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { attachmentPath, type CaseRecord } from '@/query/case.js';

const day = (value?: string) => (value ? formatDate(new Date(`${value}T12:00:00`)) : '-');
const money = (value?: number) => (value ? formatMoney(value) : '-');

// Record page: header with process and status, strip with deadlines and
// fees, and the read groups (court, parties, notes). The office's own type (AD-176) shows the contractor
// in place of the court and the parties.
export function CaseDetailsView({ legalCase, canSeeFinance }: { legalCase: CaseRecord; canSeeFinance: boolean }) {
  const own = usesContractor(legalCase);
  const client = legalCase.contractor?.name ?? legalCase.parties.find((party) => party.client)?.name;
  const { contractor } = legalCase;
  const { download } = useFileDownload();
  return (
    <div className="grid gap-6">
      <RecordHeader>
        <RecordHeading
          icon={<Scale />}
          label={serviceLabel(legalCase)}
          title={caseLabel(legalCase)}
          description={legalCase.subject}
        />
        <RecordStatus
          variant={CASE_STATUS_VARIANT[legalCase.status]}
          label={caseStatusLabel(legalCase.status)}
          pulse={legalCase.status === 'active' && !isCaseClosed(legalCase)}
        />
      </RecordHeader>
      <RecordStats>
        {legalCase.serviceOrder && <RecordStat label={t('service_order')} value={legalCase.serviceOrder} />}
        <RecordStat label={t('service_phase')} value={casePhaseLabel(legalCase.phase, legalCase.phaseName)} />
        <RecordStat label={own ? t('contracting_date') : t('appointment_date')} value={day(legalCase.nominationDate)} />
        {client && <RecordStat label={t('contracting_party')} value={client} />}
        {/* Amounts only for whoever sees finance (AD-137). */}
        {canSeeFinance && !own && <RecordStat label={t('proposed_fees')} value={money(legalCase.proposedFeesCents)} />}
        {canSeeFinance && (
          <RecordStat label={own ? t('contracted_fees') : t('fixed_fees')} value={money(legalCase.fixedFeesCents)} />
        )}
      </RecordStats>
      <ProductSpecs
        groups={[
          own
            ? {
                id: 'contractor',
                name: t('contractor_data'),
                icon: <Building2 />,
                specs: [
                  { label: t('service_type'), value: serviceTypeLabel(legalCase) },
                  { label: t('role_in_case'), value: caseRoleLabel(legalCase.role, legalCase.roleName) },
                  { label: t('name_or_company_name'), value: contractor?.name || '-' },
                  { label: t('cpf_cnpj'), value: contractor?.document || '-' },
                  { label: t('phone'), value: contractor?.phone || '-' },
                  { label: t('email'), value: contractor?.email || '-' },
                  { label: t('address'), value: contractor?.address || '-' },
                ],
              }
            : {
                id: 'juizo',
                name: t('court_header'),
                icon: <Scale />,
                specs: [
                  { label: t('service_type'), value: serviceTypeLabel(legalCase) },
                  { label: t('sphere'), value: legalCase.courtType ? courtTypeLabel(legalCase.courtType) : '-' },
                  { label: t('role_in_case'), value: caseRoleLabel(legalCase.role, legalCase.roleName) },
                  { label: t('court'), value: legalCase.court || '-' },
                  { label: t('court_division'), value: legalCase.division || '-' },
                  { label: t('judicial_district'), value: legalCase.district || '-' },
                ],
              },
          ...(own
            ? []
            : [
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
              ]),
          {
            id: 'notes',
            name: t('notes'),
            icon: <FileText />,
            specs: [
              { label: t('notes'), value: legalCase.notes || '-' },
              ...(legalCase.folderUrl
                ? [
                    {
                      label: t('folder_link'),
                      value: (
                        <ItemTitle
                          render={<a href={legalCase.folderUrl} target="_blank" rel="noreferrer" />}
                          className="link inline-flex w-fit items-center gap-2 font-normal"
                        >
                          {t('open_folder')}
                          <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
                        </ItemTitle>
                      ),
                    },
                  ]
                : []),
              ...(legalCase.attachments.length
                ? [
                    {
                      label: t('attachments'),
                      value: (
                        <div className="grid gap-1">
                          {legalCase.attachments.map((attachment) => (
                            <ItemTitle
                              key={attachment.id}
                              render={
                                <button
                                  type="button"
                                  onClick={() =>
                                    void download(attachmentPath(legalCase.id, attachment.id), attachment.name)
                                  }
                                />
                              }
                              className="link w-fit text-left font-normal"
                            >
                              {attachment.name}
                            </ItemTitle>
                          ))}
                        </div>
                      ),
                    },
                  ]
                : []),
            ],
          },
        ]}
      />
    </div>
  );
}
