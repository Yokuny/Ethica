import { Counter } from 'prom-client';

// Quality of each rule of the Automação Datajud (plan, section 5, invariant 6): how many suggestions were
// accepted, rejected or found already applied, per rule.
export const suggestionDecisions = new Counter({
  name: 'automation_suggestions_decided_total',
  help: 'Sugestões da Automação Datajud decididas, por regra e decisão',
  labelNames: ['rule', 'decision'],
});
