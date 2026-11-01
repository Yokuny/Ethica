import type { InspectionAgent, InspectionCapacity, MediaType, Side } from '@ethica/contracts';

// Translation key of each inspection record value (AD-113: value in English, text on the web).
export const CAPACITY_KEY: Record<InspectionCapacity, string> = {
  plaintiff: 'attendee_plaintiff',
  defendant: 'attendee_defendant',
  plaintiff_lawyer: 'attendee_plaintiff_lawyer',
  defendant_lawyer: 'attendee_defendant_lawyer',
  technical_assistant: 'technical_assistant',
  witness: 'witness',
  other: 'other',
};

export const INDICATED_SIDE_KEY: Record<Side, string> = {
  plaintiff: 'indicated_by_plaintiff',
  defendant: 'indicated_by_defendant',
};

export const AGENT_KEY: Record<InspectionAgent, string> = {
  noise: 'agent_noise',
  heat: 'agent_heat',
  cold: 'agent_cold',
  humidity: 'agent_humidity',
  chemicals: 'agent_chemicals',
  biological_agents: 'agent_biological',
  hazardous: 'agent_hazardous',
};

export const DOCUMENT_KEY: Record<string, string> = {
  risk_program: 'document_risk_program',
  ltcat: 'document_ltcat',
  pcmso: 'document_pcmso',
  ppe_records: 'document_ppe_records',
  ppp: 'document_ppp',
  job_description: 'document_job_description',
};

export const MEDIA_KEY: Record<MediaType, string> = { photo: 'photo', audio: 'audio', signature: 'signature' };
