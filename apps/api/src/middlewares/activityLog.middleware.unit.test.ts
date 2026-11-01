import { describe, expect, it } from 'vitest';
import { describeRequest } from './activityLog.middleware.js';

const ID = '6650f1a2b3c4d5e6f7a8b9c0';

describe('descreverRequisicao — diário de bordo (AD-134)', () => {
  it.each([
    ['POST', '/expert-cases', { module: 'expert_cases', action: 'create' }],
    ['PATCH', `/expert-cases/${ID}`, { module: 'expert_cases', action: 'update', recordId: ID }],
    [
      'POST',
      `/expert-cases/${ID}/deadlines`,
      { module: 'expert_cases', action: 'create', resource: 'deadlines', recordId: ID },
    ],
    [
      'PATCH',
      `/expert-cases/deadlines/${ID}`,
      { module: 'expert_cases', action: 'update', resource: 'deadlines', recordId: ID },
    ],
    ['POST', '/expert-cases/import/csv', { module: 'expert_cases', action: 'import', resource: 'csv' }],
    ['POST', `/expert-reports/${ID}/complete`, { module: 'expert_reports', action: 'complete', recordId: ID }],
    [
      'PUT',
      `/expert-reports/templates/${ID}/sections/${ID}`,
      { module: 'report_templates', action: 'update', resource: 'sections' },
    ],
    ['POST', `/finance/entries/${ID}/installments`, { module: 'finance', action: 'create', resource: 'installments' }],
    ['PUT', `/inspections/${ID}`, { module: 'agenda', action: 'update', resource: undefined }],
    ['POST', `/agenda/${ID}/notice`, { module: 'agenda', action: 'notify' }],
    ['POST', `/prospecting/opportunities/${ID}/convert`, { module: 'prospecting', action: 'convert' }],
    ['GET', '/documents/export', { module: 'office', action: 'export' }],
    ['PUT', '/tenant/office', { module: 'office', action: 'update' }],
    ['POST', '/tenant/invites', { module: 'users', action: 'create' }],
    ['PATCH', `/auth/users/${ID}/permissions`, { module: 'users', action: 'update', resource: 'permissions' }],
    ['PATCH', '/me/profile', { module: 'account', action: 'update', resource: 'profile' }],
  ])('%s %s', (method, path, esperado) => {
    expect(describeRequest(method, path)).toMatchObject(esperado);
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
    expect(describeRequest(method, path)).toBeUndefined();
  });
});
