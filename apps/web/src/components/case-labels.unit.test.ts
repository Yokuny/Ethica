import { describe, expect, it } from 'vitest';
import { SERVICE_TYPE_ITEMS, serviceLabel } from './case-labels.js';

describe('tipo de serviço (AD-310)', () => {
  it('os quatro tipos fixos, traduzidos', () => {
    expect(SERVICE_TYPE_ITEMS.map((item) => item.label)).toEqual([
      'Perícia',
      'Assistência técnica',
      'Parceria',
      'Serviço particular',
    ]);
    expect(serviceLabel({ serviceType: 'expert_examination', courtType: 'labor' })).toBe('Perícia · Trabalhista');
    expect(serviceLabel({})).toBe('');
  });
});
