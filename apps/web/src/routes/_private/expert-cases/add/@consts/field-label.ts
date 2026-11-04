import type { ChoiceField } from '../@utils/pdf-choices.js';

// Translation key of the label of each field the PDF may fill.
export const FIELD_LABEL: Record<ChoiceField | 'parties', string> = {
  processNumber: 'process_number',
  court: 'court',
  division: 'court_division',
  district: 'judicial_district',
  subject: 'object',
  nominationDate: 'appointment_date',
  parties: 'parties',
};
