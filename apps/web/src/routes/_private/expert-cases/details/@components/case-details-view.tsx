import { caseLabel, isCaseClosed, usesContractor } from '@ethica/contracts';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ArrowUpRight, Building2, FileText, Scale, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppLink } from '@/components/app-link.js';
import {
  CASE_STATUS_VARIANT,
  casePhaseLabel,
  caseStatusLabel,
  courtTypeLabel,
  serviceLabel,
  serviceTypeLabel,
} from '@/components/case-labels.js';
import { Panel } from '@/components/panel.js';
import { sideLabel } from '@/components/party-labels.js';
import { type ProductSpec, type ProductSpecGroup, ProductSpecs } from '@/components/product-specs.js';
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
// fees, and the read groups (court, parties, notes). Outside the perícia (AD-176, AD-310) it shows the contractor
// in place of the court and the parties. Not filled comes last, dimmed (AD-238): the empty fields close their
// group and the strip, and a group with nothing filled becomes an empty block at the bottom of the page, after
// the panels of the page (deadlines, reports…) that are empty too. It renders a fragment: its blocks are items
// of the page's flex column, so an empty one can sink below them all.
export function CaseDetailsView({ legalCase, canSeeFinance }: { legalCase: CaseRecord; canSeeFinance: boolean }) {
  const own = usesContractor(legalCase);
  const client = legalCase.contractor?.name ?? legalCase.parties.find((party) => party.client)?.name;
  const { contractor } = legalCase;
  const { download } = useFileDownload();
  // Filled fields first, then the empty ones dimmed and marked "Não preenchido".
  const arrange = (fields: Field[]): ProductSpec[] => [
    ...fields.filter((field) => field.value),
    ...fields
      .filter((field) => !field.value)
      .map((field) => ({ label: field.label, value: t('not_filled'), muted: true })),
  ];
  const stats: Field[] = [
    { label: t('service_order'), value: legalCase.serviceOrder },
    { label: t('service_phase'), value: casePhaseLabel(legalCase.phase) },
    { label: own ? t('contracting_date') : t('appointment_date'), value: day(legalCase.nominationDate) },
    { label: t('contracting_party'), value: client },
    // Amounts only for whoever sees finance (AD-137).
    ...(canSeeFinance && !own ? [{ label: t('proposed_fees'), value: money(legalCase.proposedFeesCents) }] : []),
    ...(canSeeFinance
      ? [{ label: own ? t('contracted_fees') : t('fixed_fees'), value: money(legalCase.fixedFeesCents) }]
      : []),
  ];
  const groups: (Omit<ProductSpecGroup, 'specs'> & { fields: Field[] })[] = [
    own
      ? {
          id: 'contractor',
          name: t('contractor_data'),
          icon: <Building2 />,
          fields: [
            { label: t('service_type'), value: serviceTypeLabel(legalCase.serviceType) },
            { label: t('name_or_company_name'), value: contractor?.name },
            { label: t('cpf_cnpj'), value: contractor?.document },
            { label: t('phone'), value: contractor?.phone },
            { label: t('email'), value: contractor?.email },
            { label: t('address'), value: contractor?.address },
          ],
        }
      : {
          id: 'juizo',
          name: t('court_header'),
          icon: <Scale />,
          fields: [
            { label: t('service_type'), value: serviceTypeLabel(legalCase.serviceType) },
            { label: t('sphere'), value: legalCase.courtType && courtTypeLabel(legalCase.courtType) },
            { label: t('court'), value: legalCase.court },
            { label: t('court_division'), value: legalCase.division },
            { label: t('judicial_district'), value: legalCase.district },
          ],
        },
    ...(own
      ? []
      : [
          {
            id: 'parties',
            name: t('parties'),
            icon: <Users />,
            fields: legalCase.parties.length
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
          },
        ]),
    {
      id: 'notes',
      name: t('notes'),
      icon: <FileText />,
      fields: [
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
      ],
    },
  ];
  const isFilled = (group: { fields: Field[] }) => group.fields.some((field) => field.value);
  const title = caseLabel(legalCase);
  return (
    <>
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
        {[...stats.filter((stat) => stat.value), ...stats.filter((stat) => !stat.value)].map((stat) =>
          stat.value ? (
            <RecordStat key={stat.label} label={stat.label} value={stat.value} />
          ) : (
            <RecordStat key={stat.label} label={stat.label} value="—" hint={t('not_filled')} className="opacity-60" />
          ),
        )}
      </RecordStats>
      <ProductSpecs
        groups={groups.filter(isFilled).map(({ fields, ...group }) => ({ ...group, specs: arrange(fields) }))}
      />
      {groups
        .filter((group) => !isFilled(group))
        .map((group) => (
          <Panel key={group.id} empty icon={group.icon} title={group.name}>
            <ItemDescription className="line-clamp-none">
              {group.fields.map((field) => field.label).join(' · ')}
            </ItemDescription>
          </Panel>
        ))}
    </>
  );
}
