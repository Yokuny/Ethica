import { courtTypeLabel } from '@/components/case-labels.js';
import type { TableExportColumn } from '@/lib/helpers/tableExport.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CourtDivisionRecord } from '@/query/court-division.js';

// Columns of the exported file (CSV, Excel, PDF): each division with its contacts.
export const courtDivisionExportColumns: TableExportColumn<CourtDivisionRecord>[] = [
  { header: t('court_division'), value: (division) => division.name },
  { header: t('court_type'), value: (division) => courtTypeLabel(division.courtType) },
  { header: t('court'), value: (division) => division.court },
  { header: t('state'), value: (division) => division.state },
  { header: t('city'), value: (division) => division.city },
  { header: t('address'), value: (division) => division.address },
  { header: t('phones'), value: (division) => division.phones },
  { header: t('email'), value: (division) => division.email },
  { header: t('virtual_desk'), value: (division) => division.virtualDesk },
  { header: t('notes'), value: (division) => division.notes },
];
