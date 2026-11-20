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
  it('accepts a CPF or a CNPJ (AD-244), keeping only the digits', () => {
    const base = { signupToken: 't', name: 'Ana Perita', officeName: 'Escritório Ana' };
    expect(signupSchema.parse({ ...base, document: '12.345.678/0001-95' }).document).toBe('12345678000195');
    expect(signupSchema.parse({ ...base, document: '529.982.247-25' }).document).toBe('52998224725');
    // AD-230: Asaas refuses a document with wrong check digits, so sign-up refuses it first.
    expect(signupSchema.safeParse({ ...base, document: '529.982.247-24' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, document: '111.111.111-11' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, document: '12.345.678/0001-90' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, document: '11.111.111/1111-11' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, document: '1234567890' }).success).toBe(false);
  });
});
