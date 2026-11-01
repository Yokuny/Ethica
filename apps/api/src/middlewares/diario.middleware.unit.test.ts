import { describe, expect, it } from 'vitest';
import { descreverRequisicao } from './diario.middleware.js';

const ID = '6650f1a2b3c4d5e6f7a8b9c0';

describe('descreverRequisicao — diário de bordo (AD-134)', () => {
  it.each([
    ['POST', '/expert-cases', { modulo: 'expert_cases', acao: 'create' }],
    ['PATCH', `/expert-cases/${ID}`, { modulo: 'expert_cases', acao: 'update', registroId: ID }],
    [
      'POST',
      `/expert-cases/${ID}/deadlines`,
      { modulo: 'expert_cases', acao: 'create', recurso: 'deadlines', registroId: ID },
    ],
    [
      'PATCH',
      `/expert-cases/deadlines/${ID}`,
      { modulo: 'expert_cases', acao: 'update', recurso: 'deadlines', registroId: ID },
    ],
    ['POST', '/expert-cases/import/csv', { modulo: 'expert_cases', acao: 'import', recurso: 'csv' }],
    ['POST', `/expert-reports/${ID}/complete`, { modulo: 'expert_reports', acao: 'complete', registroId: ID }],
    [
      'PUT',
      `/expert-reports/templates/${ID}/sections/${ID}`,
      { modulo: 'report_templates', acao: 'update', recurso: 'sections' },
    ],
    ['POST', `/finance/entries/${ID}/installments`, { modulo: 'finance', acao: 'create', recurso: 'installments' }],
    ['PUT', `/inspections/${ID}`, { modulo: 'agenda', acao: 'update', recurso: undefined }],
    ['POST', `/agenda/${ID}/notice`, { modulo: 'agenda', acao: 'notify' }],
    ['POST', `/prospecting/opportunities/${ID}/convert`, { modulo: 'prospecting', acao: 'convert' }],
    ['GET', '/documents/export', { modulo: 'office', acao: 'export' }],
    ['PUT', '/tenant/office', { modulo: 'office', acao: 'update' }],
    ['POST', '/tenant/invites', { modulo: 'users', acao: 'create' }],
    ['PATCH', `/auth/users/${ID}/permissions`, { modulo: 'users', acao: 'update', recurso: 'permissions' }],
    ['PATCH', '/me/profile', { modulo: 'account', acao: 'update', recurso: 'profile' }],
  ])('%s %s', (method, path, esperado) => {
    expect(descreverRequisicao(method, path)).toMatchObject(esperado);
  });

  it.each([
    ['GET', '/expert-cases'],
    ['GET', `/expert-reports/${ID}/pdf`],
    ['PATCH', '/me/preferences'],
    ['POST', `/agenda/${ID}/geocode`],
    ['POST', '/prospecting/datajud/search'],
    ['POST', '/auth/signin'],
    ['POST', '/invites/abc/accept'],
  ])('não registra %s %s', (method, path) => {
    expect(descreverRequisicao(method, path)).toBeUndefined();
  });
});
