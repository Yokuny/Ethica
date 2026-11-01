import { describe, expect, it } from 'vitest';
import { descreverRequisicao } from './diario.middleware.js';

const ID = '6650f1a2b3c4d5e6f7a8b9c0';

describe('descreverRequisicao — diário de bordo (AD-134)', () => {
  it.each([
    ['POST', '/pericias', { modulo: 'pericias', acao: 'create' }],
    ['PATCH', `/pericias/${ID}`, { modulo: 'pericias', acao: 'update', registroId: ID }],
    ['POST', `/pericias/${ID}/prazos`, { modulo: 'pericias', acao: 'create', recurso: 'prazos', registroId: ID }],
    ['PATCH', `/pericias/prazos/${ID}`, { modulo: 'pericias', acao: 'update', recurso: 'prazos', registroId: ID }],
    ['POST', '/pericias/import/csv', { modulo: 'pericias', acao: 'import', recurso: 'csv' }],
    ['POST', `/laudos/${ID}/concluir`, { modulo: 'laudos', acao: 'complete', registroId: ID }],
    ['PUT', `/laudos/modelos/${ID}/secoes/${ID}`, { modulo: 'modelos', acao: 'update', recurso: 'secoes' }],
    ['POST', `/financeiro/lancamentos/${ID}/parcelas`, { modulo: 'financeiro', acao: 'create', recurso: 'parcelas' }],
    ['PUT', `/vistorias/${ID}`, { modulo: 'agenda', acao: 'update', recurso: undefined }],
    ['POST', `/agenda/${ID}/aviso`, { modulo: 'agenda', acao: 'notify' }],
    ['POST', `/prospeccao/oportunidades/${ID}/converter`, { modulo: 'prospeccao', acao: 'convert' }],
    ['GET', '/documentos/export', { modulo: 'escritorio', acao: 'export' }],
    ['PUT', '/tenant/office', { modulo: 'escritorio', acao: 'update' }],
    ['POST', '/tenant/invites', { modulo: 'usuarios', acao: 'create' }],
    ['PATCH', `/auth/users/${ID}/permissoes`, { modulo: 'usuarios', acao: 'update', recurso: 'permissoes' }],
    ['PATCH', '/me/profile', { modulo: 'conta', acao: 'update', recurso: 'profile' }],
  ])('%s %s', (method, path, esperado) => {
    expect(descreverRequisicao(method, path)).toMatchObject(esperado);
  });

  it.each([
    ['GET', '/pericias'],
    ['GET', `/laudos/${ID}/pdf`],
    ['PATCH', '/me/preferences'],
    ['POST', `/agenda/${ID}/geocode`],
    ['POST', '/prospeccao/datajud/search'],
    ['POST', '/auth/signin'],
    ['POST', '/invites/abc/accept'],
  ])('não registra %s %s', (method, path) => {
    expect(descreverRequisicao(method, path)).toBeUndefined();
  });
});
