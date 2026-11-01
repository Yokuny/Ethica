import { BriefcaseBusiness, FileText, Scale, Users } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { CASE_STATE_VARIANT, CASE_STATUS_VARIANT, courtTypeLabel, phaseLabel } from '@/components/case-labels.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { RecordHeader, RecordHeading, RecordStat, RecordStats, RecordStatus } from '@/components/record.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseRecord } from '@/query/case.js';

const day = (value?: string) => (value ? formatDate(new Date(`${value}T12:00:00`)) : '-');
const period = (inicio?: string, fim?: string) => (inicio || fim ? `${day(inicio)} – ${day(fim)}` : '-');
const money = (value?: number) => (value ? formatMoney(value) : '-');

// Página de registro: cabeçalho com processo e etapa, faixa com prazos e
// honorários, e os grupos de leitura (juízo, partes, observações).
export function CaseDetailsView({ legalCase, canSeeFinance }: { legalCase: CaseRecord; canSeeFinance: boolean }) {
  const variant = CASE_STATUS_VARIANT[legalCase.status];
  const client = legalCase.parties.find((party) => party.client)?.nome;
  return (
    <div className="grid gap-6">
      <RecordHeader>
        <RecordHeading
          icon={<Scale />}
          label={t(legalCase.role)}
          title={legalCase.processNumber}
          description={legalCase.phase ? `${legalCase.subject} · ${phaseLabel(legalCase.phase)}` : legalCase.subject}
        />
        {legalCase.state === 'suspended' ? (
          <RecordStatus variant={CASE_STATE_VARIANT.suspended} label={t('situation_suspended')} />
        ) : (
          <RecordStatus variant={variant} label={t(legalCase.status)} pulse={legalCase.state === 'active'} />
        )}
      </RecordHeader>
      <RecordStats>
        <RecordStat label={t('appointment_date')} value={day(legalCase.nominationDate)} />
        {client && <RecordStat label={t('contracting_party')} value={client} />}
        {/* Valores só para quem vê o financeiro (AD-137). */}
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
              { label: t('court_type'), value: courtTypeLabel(legalCase.courtType) },
              { label: t('court'), value: legalCase.court },
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
                  label: [t(party.side), t(party.tipo), party.client ? t('contracting_party') : '']
                    .filter(Boolean)
                    .join(' · '),
                  value: (
                    <AppLink to="/parties/details" search={{ id: party.partyId }}>
                      {party.nome}
                    </AppLink>
                  ),
                }))
              : [{ label: t('parties'), value: '-' }],
          },
          ...(legalCase.courtType === 'labor'
            ? [
                {
                  id: 'labor',
                  name: t('labor_report_data'),
                  icon: <BriefcaseBusiness />,
                  specs: [
                    { label: t('lawsuit_filing_date'), value: day(legalCase.docketingDate) },
                    { label: t('hiring_date'), value: day(legalCase.hireDate) },
                    { label: t('termination_date'), value: day(legalCase.terminationDate) },
                    {
                      label: t('non_prescribed_period'),
                      value: period(legalCase.nonPrescribedPeriodStart, legalCase.nonPrescribedPeriodEnd),
                    },
                    { label: t('claimant_job'), value: legalCase.claimantJob || '-' },
                    { label: t('inspection_address'), value: legalCase.location || '-' },
                  ],
                },
              ]
            : []),
          {
            id: 'observacoes',
            name: t('notes'),
            icon: <FileText />,
            specs: [{ label: t('notes'), value: legalCase.observacoes || '-' }],
          },
        ]}
      />
    </div>
  );
}
