import type { CreateCase } from '@ethica/contracts';

// Translation key of the label of each field the PDF may fail to bring.
export const FIELD_LABEL: Partial<Record<keyof CreateCase, string>> = {
  processNumber: 'process_number',
  court: 'court',
  division: 'court_division',
  district: 'judicial_district',
  subject: 'object',
  parties: 'parties',
  nominationDate: 'appointment_date',
  reportDeadline: 'report_deadline',
};
