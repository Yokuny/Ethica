import type { CasePhase } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { ChevronRight, ListFilter, Search } from 'lucide-react';
import { casePhaseLabel } from '@/components/case-labels.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10: the Filters menu open, the subject of the piece; the list behind it stays faint.

const FILTERS = [
  { label: t('control_number') },
  { label: t('service_phase'), value: '3' },
  { label: t('status'), value: t('suspended') },
  { label: t('sphere'), value: t('labor_court') },
  { label: t('service_type') },
  { label: t('delivery_period') },
];

// A real-looking list, kept faint: process (or service name) with the subject, phase and next deadline.
const TODAY = formatDisplayDate(new Date());
const ROWS: { title: string; subject: string; phase: CasePhase; due?: number }[] = [
  {
    title: '0010234-55.2025.5.02.0011',
    subject: t('sample_subject_noise'),
    phase: 'inspection_scheduled',
    due: 4,
  },
  {
    title: '1002871-12.2025.5.02.0384',
    subject: t('sample_subject_ergonomics'),
    phase: 'drafting_report',
    due: 7,
  },
  { title: '0011456-08.2024.5.02.0062', subject: t('sample_subject_electric'), phase: 'objection_reply', due: 11 },
  { title: '1004418-73.2024.8.26.0100', subject: t('sample_subject_building'), phase: 'fee_proposal', due: 14 },
  {
    title: '0010877-31.2025.5.02.0047',
    subject: t('sample_subject_assistance'),
    phase: 'case_file_study',
    due: 18,
  },
  { title: t('sample_subject_property'), subject: 'OS-0120', phase: 'document_request', due: 21 },
  { title: '0012019-44.2024.5.02.0021', subject: t('sample_subject_noise'), phase: 'report_delivered', due: undefined },
];

export function ShowcaseCases() {
  return (
    <div className="relative flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <ListFilter />
          {t('filters')}
          <Badge variant="secondary" className="h-5">
            3
          </Badge>
        </Button>
        <Search aria-hidden className="size-3.5 text-muted-foreground/60" />
        <ItemDescription className="text-xs text-muted-foreground/60">{t('search')}</ItemDescription>
      </div>
      <Table className="text-xs opacity-45">
        <TableHeader>
          <TableRow>
            <TableHead>{t('expert_case')}</TableHead>
            <TableHead>{t('service_phase')}</TableHead>
            <TableHead>{t('next_deadline')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.title}>
              <TableCell className="py-3">
                <ItemTitle className="font-normal text-xs">{row.title}</ItemTitle>
                <ItemDescription className="text-[11px]">{row.subject}</ItemDescription>
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">{casePhaseLabel(row.phase)}</TableCell>
              <TableCell className="py-3 text-muted-foreground tabular-nums">
                {row.due === undefined ? '—' : formatDate(new Date(`${addDaysToDisplayDate(TODAY, row.due)}T12:00:00`))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Item className="absolute top-13 left-4 w-60 flex-col flex-nowrap items-stretch gap-0 p-1">
        {FILTERS.map((filter) => (
          <div key={filter.label} className="flex items-center gap-2 px-2 py-1.5">
            <ItemTitle className="flex-1 truncate font-normal text-xs">{filter.label}</ItemTitle>
            {filter.value && <ItemDescription className="text-xs">{filter.value}</ItemDescription>}
            <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" />
          </div>
        ))}
      </Item>
    </div>
  );
}
