import type { CreateCase } from '@ethica/contracts';

// Chave de tradução do rótulo de cada campo que o PDF pode deixar de trazer.
export const CAMPO_LABEL: Partial<Record<keyof CreateCase, string>> = {
  processNumber: 'process_number',
  court: 'court',
  division: 'court_division',
  district: 'judicial_district',
  subject: 'object',
  parties: 'parties',
  nominationDate: 'appointment_date',
  reportDeadline: 'report_deadline',
};
