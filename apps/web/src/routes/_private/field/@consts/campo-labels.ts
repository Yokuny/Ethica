import type { MidiaTipo, Polo, VistoriaAgente, VistoriaQualidade } from '@ethica/contracts';

// Chave de tradução de cada valor do registro de vistoria (AD-113: valor em inglês, texto no web).
export const QUALIDADE_KEY: Record<VistoriaQualidade, string> = {
  plaintiff: 'attendee_plaintiff',
  defendant: 'attendee_defendant',
  plaintiff_lawyer: 'attendee_plaintiff_lawyer',
  defendant_lawyer: 'attendee_defendant_lawyer',
  technical_assistant: 'technical_assistant',
  witness: 'witness',
  other: 'other',
};

export const POLO_INDICADO_KEY: Record<Polo, string> = {
  plaintiff: 'indicated_by_plaintiff',
  defendant: 'indicated_by_defendant',
};

export const AGENTE_KEY: Record<VistoriaAgente, string> = {
  noise: 'agent_noise',
  heat: 'agent_heat',
  cold: 'agent_cold',
  humidity: 'agent_humidity',
  chemicals: 'agent_chemicals',
  biological_agents: 'agent_biological',
  hazardous: 'agent_hazardous',
};

export const DOCUMENTO_KEY: Record<string, string> = {
  risk_program: 'document_risk_program',
  ltcat: 'document_ltcat',
  pcmso: 'document_pcmso',
  ppe_records: 'document_ppe_records',
  ppp: 'document_ppp',
  job_description: 'document_job_description',
};

export const MIDIA_KEY: Record<MidiaTipo, string> = { photo: 'photo', audio: 'audio', signature: 'signature' };
