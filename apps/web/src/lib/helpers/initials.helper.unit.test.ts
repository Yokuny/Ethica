import { describe, expect, it } from 'vitest';
import { initials } from './initials.helper.js';

describe('initials', () => {
  it('takes the first letter of the first and last names', () => {
    expect(initials('Ana Maria Souza')).toBe('AS');
  });

  it('uses a single letter for a single name and ignores extra spaces', () => {
    expect(initials('  felipe  ')).toBe('F');
  });

  it('returns an empty string for an empty name', () => {
    expect(initials('')).toBe('');
  });
});
