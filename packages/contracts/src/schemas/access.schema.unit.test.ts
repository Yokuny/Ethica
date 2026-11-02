import { describe, expect, it } from 'vitest';
import { accessKeyRequestSchema, accessKeyVerifySchema, signupSchema } from './access.schema.js';

describe('accessKeyRequestSchema', () => {
  it('lowercases the e-mail and rejects extra fields', () => {
    expect(accessKeyRequestSchema.parse({ email: 'User@Example.com' })).toEqual({ email: 'user@example.com' });
    expect(accessKeyRequestSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(false);
  });
});

describe('accessKeyVerifySchema', () => {
  it('accepts the link token or the e-mail with a 6-digit code', () => {
    expect(accessKeyVerifySchema.safeParse({ token: 'a'.repeat(64) }).success).toBe(true);
    expect(accessKeyVerifySchema.safeParse({ email: 'a@b.com', code: '123456' }).success).toBe(true);
    expect(accessKeyVerifySchema.safeParse({ email: 'a@b.com', code: '12345' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts only a CNPJ (AD-144), keeping only the digits', () => {
    const base = { signupToken: 't', name: 'Ana Perita', officeName: 'Escritório Ana' };
    expect(signupSchema.parse({ ...base, document: '12.345.678/0001-90' }).document).toBe('12345678000190');
    expect(signupSchema.safeParse({ ...base, document: '123.456.789-01' }).success).toBe(false);
  });
});
