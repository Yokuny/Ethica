import { caseLabel, isCaseClosed, usesContractor } from '@ethica/contracts';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ArrowUpRight, Building2, CircleDashed, FileText, Scale, Users } from 'lucide-react';
import type { ReactNode } from 'react';
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
import { type ProductSpecGroup, ProductSpecs } from '@/components/product-specs.js';
import { RecordHeader, RecordHeading, RecordStat, RecordStats, RecordStatus } from '@/components/record.js';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { attachmentPath, type CaseRecord } from '@/query/case.js';

const day = (value?: string) => (value ? formatDate(new Date(`${value}T12:00:00`)) : undefined);
const money = (value?: number) => (value ? formatMoney(value) : undefined);

type Field = { label: string; value: ReactNode };

// Record page: header with process and status, strip with deadlines and
// fees, and the read groups (court, parties, notes). The office's own type (AD-176) shows the contractor
// in place of the court and the parties. Only filled fields are shown: the empty ones are named once, at
// the end, under "Não preenchido", and a group with nothing filled does not appear (AD-238).
export function CaseDetailsView({ legalCase, canSeeFinance }: { legalCase: CaseRecord; canSeeFinance: boolean }) {
  const own = usesContractor(legalCase);
  const client = legalCase.contractor?.name ?? legalCase.parties.find((party) => party.client)?.name;
  const { contractor } = legalCase;
  const { download } = useFileDownload();
  const missing: string[] = [];
  // Keeps the filled fields and sends the labels of the empty ones to the "Não preenchido" list.
  const filled = (fields: Field[]) =>
    fields.filter((field) => {
      if (field.value) return true;
      missing.push(field.label);
      return false;
    });
  const stats = filled([
    { label: t('service_order'), value: legalCase.serviceOrder },
    { label: t('service_phase'), value: casePhaseLabel(legalCase.phase, legalCase.phaseName) },
    { label: own ? t('contracting_date') : t('appointment_date'), value: day(legalCase.nominationDate) },
    { label: t('contracting_party'), value: client },
    // Amounts only for whoever sees finance (AD-137).
    ...(canSeeFinance && !own ? [{ label: t('proposed_fees'), value: money(legalCase.proposedFeesCents) }] : []),
    ...(canSeeFinance
      ? [{ label: own ? t('contracted_fees') : t('fixed_fees'), value: money(legalCase.fixedFeesCents) }]
      : []),
  ]);
  const groups: ProductSpecGroup[] = [
    own
      ? {
          id: 'contractor',
          name: t('contractor_data'),
          icon: <Building2 />,
          specs: filled([
            { label: t('service_type'), value: serviceTypeLabel(legalCase) },
            { label: t('role_in_case'), value: caseRoleLabel(legalCase.role, legalCase.roleName) },
            { label: t('name_or_company_name'), value: contractor?.name },
            { label: t('cpf_cnpj'), value: contractor?.document },
            { label: t('phone'), value: contractor?.phone },
            { label: t('email'), value: contractor?.email },
            { label: t('address'), value: contractor?.address },
          ]),
        }
      : {
          id: 'juizo',
          name: t('court_header'),
          icon: <Scale />,
          specs: filled([
            { label: t('service_type'), value: serviceTypeLabel(legalCase) },
            { label: t('sphere'), value: legalCase.courtType && courtTypeLabel(legalCase.courtType) },
            { label: t('role_in_case'), value: caseRoleLabel(legalCase.role, legalCase.roleName) },
            { label: t('court'), value: legalCase.court },
            { label: t('court_division'), value: legalCase.division },
            { label: t('judicial_district'), value: legalCase.district },
          ]),
        },
    ...(own
      ? []
      : [
          {
            id: 'parties',
            name: t('parties'),
            icon: <Users />,
            specs: filled(
              legalCase.parties.length
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
                : [{ label: t('parties'), value: undefined }],
            ),
          },
        ]),
    {
      id: 'notes',
      name: t('notes'),
      icon: <FileText />,
      specs: filled([
        { label: t('notes'), value: legalCase.notes },
        {
          label: t('folder_link'),
          value: legalCase.folderUrl && (
            <ItemTitle
              render={<a href={legalCase.folderUrl} target="_blank" rel="noreferrer" />}
              className="link inline-flex w-fit items-center gap-2 font-normal"
            >
              {t('open_folder')}
              <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
            </ItemTitle>
          ),
        },
        {
          label: t('attachments'),
          value: legalCase.attachments.length > 0 && (
            <div className="grid gap-1">
              {legalCase.attachments.map((attachment) => (
                <ItemTitle
                  key={attachment.id}
                  render={
                    <button
                      type="button"
                      onClick={() => void download(attachmentPath(legalCase.id, attachment.id), attachment.name)}
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
      ]),
    },
  ].filter((group) => group.specs?.length);
  const title = caseLabel(legalCase);
  return (
    <div className="grid gap-6">
      <RecordHeader>
        <RecordHeading
          icon={<Scale />}
          label={serviceLabel(legalCase)}
          title={title}
          description={legalCase.subject !== title ? legalCase.subject : undefined}
        />
        <RecordStatus
          variant={CASE_STATUS_VARIANT[legalCase.status]}
          label={caseStatusLabel(legalCase.status)}
          pulse={legalCase.status === 'active' && !isCaseClosed(legalCase)}
        />
      </RecordHeader>
      <RecordStats>
        {stats.map((stat) => (
          <RecordStat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </RecordStats>
      <ProductSpecs
        groups={[
          ...groups,
          ...(missing.length
            ? [
                {
                  id: 'not_filled',
                  name: t('not_filled'),
                  icon: <CircleDashed />,
                  children: (
                    <ItemDescription className="line-clamp-none px-4 py-3">{missing.join(' · ')}</ItemDescription>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
