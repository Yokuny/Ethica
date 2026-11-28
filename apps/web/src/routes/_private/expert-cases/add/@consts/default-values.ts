import type { CaseFormValues } from '../../@interface/cases.interface.js';

export const DEFAULT_VALUES: CaseFormValues = {
  processNumber: '',
  court: '',
  subject: '',
  courtType: 'labor',
  serviceType: 'expert_examination',
  phase: 'awaiting_scheduling',
  status: 'active',
  parties: [],
};
