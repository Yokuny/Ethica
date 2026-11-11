import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { queryListSchema } from './query-list.schema.js';

const schema = z.object({ phase: queryListSchema(z.enum(['a', 'b'])) });

describe('queryListSchema (FIL-03)', () => {
  it('turns one value or a repeated key into a list', () => {
    expect(schema.parse({ phase: 'a' })).toEqual({ phase: ['a'] });
    expect(schema.parse({ phase: ['a', 'b'] })).toEqual({ phase: ['a', 'b'] });
  });

  it('leaves the filter out when missing or empty', () => {
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ phase: '' })).toEqual({ phase: undefined });
  });

  it('rejects an unknown value', () => {
    expect(schema.safeParse({ phase: ['a', 'x'] }).success).toBe(false);
  });
});
