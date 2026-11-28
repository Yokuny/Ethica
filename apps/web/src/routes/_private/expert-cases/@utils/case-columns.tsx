import { caseLabel, type Side, usesContractor } from '@ethica/contracts';
import { BadgeIndicator } from '@ethica/ui/components/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ethica/ui/components/tooltip';
import type { ColumnDef } from '@tanstack/react-table';
import { BriefcaseBusiness } from 'lucide-react';
import { CASE_STATUS_VARIANT, casePhaseLabel, caseStatusLabel, serviceLabel } from '@/components/case-labels.js';
import { TableIdentity, TableStack, TableStatus } from '@/components/data-table.js';
import { ALERT_VARIANT, deadlineAlert } from '@/components/notification-labels.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import type { TableExportColumn } from '@/lib/helpers/tableExport.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseListItem } from '@/query/case.js';

const toDate = (day: string) => new Date(`${day}T12:00:00`);
// Names of the parties (not the lawyers) of one side, for the "Contratante" column of a perícia.
const names = (row: CaseListItem, side: Side) =>
  row.parties.filter((party) => party.side === side && party.type === 'party').map((party) => party.name);
// One line per side: the first name, cut to one line, and how many more; the whole list is in the tooltip.
const firstName = (list: string[]) => (
  <span className="block truncate">
    {list[0]}
    {list.length > 1 && ` +${list.length - 1}`}
  </span>
);

function PartiesCell({ row }: { row: CaseListItem }) {
  const sides = (['plaintiff', 'defendant'] as const).map((side) => ({ side, list: names(row, side) }));
  const [plaintiffs, defendants] = sides.map(({ list }) => list);
  if (!plaintiffs.length && !defendants.length) return <TableStack tone="muted">—</TableStack>;
  return (
    <Tooltip>
      <TooltipTrigger render={<div />} className="cursor-default">
        <TableStack width="text" description={defendants.length ? firstName(defendants) : undefined}>
          {plaintiffs.length ? firstName(plaintiffs) : '—'}
        </TableStack>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex max-w-80 flex-col gap-2">
          {sides
            .filter(({ list }) => list.length)
            .map(({ side, list }) => (
              <div key={side} className="flex flex-col gap-0.5">
                <span className="font-medium">{t(side)}</span>
                {list.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Sortable columns (AD-192) have an `accessorFn` and the `id` of the server sort (`CASE_LIST_SORTS`); the sort
// itself is on the server, the value only enables the header click.
export const caseColumns: ColumnDef<CaseListItem, unknown>[] = [
  {
    // Service order control number (OS) given by the office.
    id: 'serviceOrder',
    accessorFn: (row) => row.serviceOrder,
    header: t('control'),
    cell: ({ row }) => (
      <TableStack width="fit" tone={row.original.serviceOrder ? 'default' : 'muted'}>
        {row.original.serviceOrder ?? '—'}
      </TableStack>
    ),
  },
  {
    id: 'name',
    accessorFn: (row) => caseLabel(row),
    header: t('expert_case'),
    cell: ({ row }) => (
      <TableIdentity
        icon={BriefcaseBusiness}
        title={caseLabel(row.original)}
        description={row.original.processNumber ? row.original.subject : undefined}
      />
    ),
  },
  {
    // Perícia: plaintiff on the first line, defendant below; the other types: whoever hired it (AD-176).
    id: 'contractor',
    header: t('contracting_party'),
    cell: ({ row }) =>
      usesContractor(row.original) ? (
        <TableStack width="text">{row.original.contractor?.name ?? '—'}</TableStack>
      ) : (
        <PartiesCell row={row.original} />
      ),
  },
  {
    id: 'type',
    accessorFn: (row) => serviceLabel(row),
    header: t('service_type'),
    cell: ({ row }) => <TableStack width="fit">{serviceLabel(row.original)}</TableStack>,
  },
  {
    // Perícia: court and division; the other types: who hired it (AD-176).
    id: 'clientDistrict',
    header: t('client_district'),
    cell: ({ row }) =>
      usesContractor(row.original) ? (
        <TableStack width="text">{row.original.contractor?.name ?? '—'}</TableStack>
      ) : (
        <TableStack width="text" description={row.original.division || row.original.district || undefined}>
          {row.original.court ?? '—'}
        </TableStack>
      ),
  },
  {
    id: 'phase',
    header: t('service_phase'),
    // Phase in the tone of the status (AD-178); a status other than active is named after it. One line.
    cell: ({ row }) => (
      <TableStatus variant={CASE_STATUS_VARIANT[row.original.status]}>
        {[casePhaseLabel(row.original.phase), row.original.status !== 'active' && caseStatusLabel(row.original.status)]
          .filter(Boolean)
          .join(' · ')}
      </TableStatus>
    ),
  },
  {
    id: 'nextDue',
    header: t('next_deadline'),
    cell: ({ row }) => {
      const deadline = row.original.nextDue;
      if (!deadline) return <TableStack tone="muted">—</TableStack>;
      const alert = deadlineAlert(deadline, formatDisplayDate(new Date()));
      const date = formatDate(toDate(deadline.dueDate));
      // Alert dot before the date, its meaning in the tooltip of the dot and the date; the deadline title below.
      return (
        <TableStack width="text" description={deadline.title}>
          {alert ? (
            <Tooltip>
              <TooltipTrigger
                render={<span />}
                aria-label={`${date} · ${t(alert)}`}
                className="inline-flex items-center gap-2 whitespace-nowrap"
              >
                <BadgeIndicator variant={ALERT_VARIANT[alert]} />
                {date}
              </TooltipTrigger>
              <TooltipContent>{t(alert)}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="whitespace-nowrap">{date}</span>
          )}
        </TableStack>
      );
    },
  },
  {
    id: 'fees',
    header: t('fees'),
    cell: ({ row }) => {
      const { fixedFeesCents, proposedFeesCents } = row.original;
      const value = fixedFeesCents ?? proposedFeesCents;
      // Outside the perícia (AD-135, AD-176) it is the contracted one.
      const definido = usesContractor(row.original) ? t('contracted') : t('fixed');
      return (
        <TableStack width="fit" description={fixedFeesCents ? definido : value ? t('proposed') : undefined}>
          {value ? formatMoney(value) : '—'}
        </TableStack>
      );
    },
  },
];

// Same columns in the exported file (CSV, Excel, PDF), one text per cell; amounts only for whoever sees finance.
export const caseExportColumns = (canSeeFinance: boolean): TableExportColumn<CaseListItem>[] => [
  { header: t('control'), value: (row) => row.serviceOrder },
  { header: t('expert_case'), value: (row) => caseLabel(row) },
  { header: t('object'), value: (row) => row.subject },
  {
    header: t('contracting_party'),
    value: (row) =>
      usesContractor(row)
        ? row.contractor?.name
        : [names(row, 'plaintiff').join(', '), names(row, 'defendant').join(', ')].filter(Boolean).join(' x '),
  },
  { header: t('service_type'), value: (row) => serviceLabel(row) },
  {
    header: t('client_district'),
    value: (row) =>
      usesContractor(row)
        ? row.contractor?.name
        : [row.court, row.division || row.district].filter(Boolean).join(' · '),
  },
  {
    header: t('service_phase'),
    value: (row) =>
      [casePhaseLabel(row.phase), row.status !== 'active' && caseStatusLabel(row.status)].filter(Boolean).join(' · '),
  },
  {
    header: t('next_deadline'),
    value: (row) => row.nextDue && `${formatDate(toDate(row.nextDue.dueDate))} · ${row.nextDue.title}`,
  },
  ...(canSeeFinance
    ? [
        {
          header: t('fees'),
          value: (row: CaseListItem) => {
            const value = row.fixedFeesCents ?? row.proposedFeesCents;
            return value ? formatMoney(value) : undefined;
          },
        },
      ]
    : []),
];
