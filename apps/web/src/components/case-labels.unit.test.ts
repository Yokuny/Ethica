import { describe, expect, it } from 'vitest';
import { serviceTypeItems } from './case-labels.js';

describe('serviceTypeItems (AD-199)', () => {
  it('oferece as opções fixas mesmo sem serviço cadastrado e não repete as já usadas', () => {
    const labels = serviceTypeItems([{ name: 'Parceria' }, { name: 'Avaliação de imóvel' }]).map((item) => item.label);
    expect(labels).toEqual(['Perícia', 'Assistência técnica', 'Parceria', 'Serviço particular', 'Avaliação de imóvel']);
    expect(serviceTypeItems([]).map((item) => item.label)).toContain('Serviço particular');
  });
});
