import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { ChevronRight, ListFilter, Search } from 'lucide-react';
import { casePhaseLabel } from '@/components/case-labels.js';
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

const ROWS = [
  { title: t('sample_subject_noise'), phase: casePhaseLabel('inspection_scheduled') },
  { title: t('sample_subject_ergonomics'), phase: casePhaseLabel('drafting_report') },
  { title: t('sample_subject_electric'), phase: casePhaseLabel('objection_reply') },
  { title: t('sample_subject_building'), phase: casePhaseLabel('fee_proposal') },
  { title: t('sample_subject_assistance'), phase: casePhaseLabel('case_file_study') },
  { title: t('sample_subject_property'), phase: casePhaseLabel('document_request') },
  { title: t('sample_subject_noise'), phase: casePhaseLabel('report_delivered') },
];

export function ShowcaseCases() {
  return (
    <div className="relative flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <ListFilter />
          {t('filters')}
          <Badge variant="secondary">3</Badge>
        </Button>
        <Search aria-hidden className="size-3.5 text-muted-foreground/60" />
        <ItemDescription className="text-xs text-muted-foreground/60">{t('search')}</ItemDescription>
      </div>
      <Table className="text-[11px] opacity-40">
        <TableHeader>
          <TableRow>
            <TableHead>{t('expert_case')}</TableHead>
            <TableHead>{t('service_phase')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.phase}>
              <TableCell>{row.title}</TableCell>
              <TableCell className="text-muted-foreground">{row.phase}</TableCell>
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
