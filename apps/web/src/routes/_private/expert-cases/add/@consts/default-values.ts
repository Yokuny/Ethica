import type { CaseFormValues } from '../../@interface/cases.interface.js';

export const DEFAULT_VALUES: CaseFormValues = {
  processNumber: '',
  court: '',
  subject: '',
  courtType: 'labor',
  role: 'court_expert',
  parties: [],
};
