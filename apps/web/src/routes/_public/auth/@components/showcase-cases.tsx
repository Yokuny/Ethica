import type { CasePhase, CaseStatus } from '@ethica/contracts';
import { Badge, BadgeIndicator } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { InputGroup, InputGroupInput } from '@ethica/ui/components/input-group';
import { Item, ItemTitle } from '@ethica/ui/components/item';
import { Separator } from '@ethica/ui/components/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { BriefcaseBusiness, ChevronRight, ListFilter, Search } from 'lucide-react';
import { CASE_STATUS_VARIANT, casePhaseLabel, caseStatusLabel } from '@/components/case-labels.js';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { ALERT_VARIANT, type DeadlineAlert } from '@/components/deadline-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10: the services list with the Filters menu open, as in the real list (data-table.tsx).

const FILTERS = [
  { label: t('control_number') },
  { label: t('service_phase'), value: '3' },
  { label: t('status'), value: t('suspended') },
  { label: t('sphere'), value: t('labor_court') },
  { label: t('service_type') },
  { label: t('delivery_period') },
];

const CASES: {
  control: string;
  number: string;
  subject: string;
  phase: CasePhase;
  status: CaseStatus;
  alert?: DeadlineAlert;
  deadline: string;
}[] = [
  {
    control: 'OS-0142',
    number: '0010234-55.2025.5.02.0011',
    subject: t('sample_subject_noise'),
    phase: 'inspection_scheduled',
    status: 'active',
    alert: 'deadline_urgent',
    deadline: t('report_deadline'),
  },
  {
    control: 'OS-0139',
    number: '1002871-12.2025.5.02.0384',
    subject: t('sample_subject_ergonomics'),
    phase: 'drafting_report',
    status: 'active',
    alert: 'due_soon',
    deadline: t('report_deadline'),
  },
  {
    control: 'OS-0131',
    number: '0011456-08.2024.5.02.0062',
    subject: t('sample_subject_electric'),
    phase: 'objection_reply',
    status: 'suspended',
    deadline: t('deadline'),
  },
  {
    control: 'OS-0127',
    number: '1004418-73.2024.8.26.0100',
    subject: t('sample_subject_building'),
    phase: 'fee_proposal',
    status: 'active',
    alert: 'deadline_attention',
    deadline: t('deadline'),
  },
];

export function ShowcaseCases() {
  return (
    <Item className="relative flex-col flex-nowrap items-stretch gap-0 overflow-hidden p-0">
      <div className="flex items-center gap-2 px-4 py-2">
        <Button variant="secondary">
          <ListFilter />
          {t('filters')}
          <Badge variant="secondary">3</Badge>
        </Button>
        <InputGroup className="max-w-56 flex-1">
          <Search aria-hidden />
          <InputGroupInput placeholder={t('search')} tabIndex={-1} />
        </InputGroup>
      </div>
      <Separator />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('expert_case')}</TableHead>
            <TableHead>{t('service_phase')}</TableHead>
            <TableHead>{t('next_deadline')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CASES.map((row) => (
            <TableRow key={row.control}>
              <TableCell>
                <TableIdentity
                  icon={BriefcaseBusiness}
                  title={row.number}
                  description={`${row.control} · ${row.subject}`}
                />
              </TableCell>
              <TableCell>
                <TableStatus variant={CASE_STATUS_VARIANT[row.status]}>
                  {[casePhaseLabel(row.phase), row.status !== 'active' && caseStatusLabel(row.status)]
                    .filter(Boolean)
                    .join(' · ')}
                </TableStatus>
              </TableCell>
              <TableCell>
                {row.alert ? (
                  <TableStatus variant={ALERT_VARIANT[row.alert]}>
                    <BadgeIndicator variant={ALERT_VARIANT[row.alert]} />
                    {t(row.alert)}
                  </TableStatus>
                ) : (
                  <TableStack tone="muted">{row.deadline}</TableStack>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Item className="absolute top-12 left-4 w-64 flex-col flex-nowrap items-stretch gap-0 p-1 shadow-lg">
        {FILTERS.map((filter) => (
          <div key={filter.label} className="flex items-center gap-2 px-2 py-1.5">
            <ItemTitle className="flex-1 truncate font-normal">{filter.label}</ItemTitle>
            {filter.value && <ItemTitle className="font-normal text-muted-foreground">{filter.value}</ItemTitle>}
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </div>
        ))}
      </Item>
    </Item>
  );
}
