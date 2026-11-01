import type { CreatePericia } from '@ethica/contracts';

// Chave de tradução do rótulo de cada campo que o PDF pode deixar de trazer.
export const CAMPO_LABEL: Partial<Record<keyof CreatePericia, string>> = {
  numeroProcesso: 'process_number',
  tribunal: 'tribunal',
  vara: 'court_division',
  comarca: 'judicial_district',
  objeto: 'object',
  partes: 'parties',
  dataNomeacao: 'appointment_date',
  prazoLaudo: 'report_deadline',
};
