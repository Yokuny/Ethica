import { describe, expect, it } from 'vitest';
import { acceptInviteSchema } from './acceptInvite.schema.js';

describe('acceptInviteSchema', () => {
  it('accepts a valid name', () => {
    expect(acceptInviteSchema.safeParse({ name: 'Fulano Beltrano' }).success).toBe(true);
  });

  it('rejects a password or forged tenantId instead of silently dropping it', () => {
    expect(acceptInviteSchema.safeParse({ name: 'Fulano Beltrano', password: 'password123' }).success).toBe(false);
    expect(acceptInviteSchema.safeParse({ name: 'Fulano Beltrano', tenantId: 'x' }).success).toBe(false);
  });
});
