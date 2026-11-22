// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { router } from './router.js';

const { parseSearch, stringifySearch } = router.options;

describe('search params', () => {
  it('writes text without quotes and lists as JSON', () => {
    expect(stringifySearch({ q: '123', page: 2, status: ['open'] })).toBe('?q=123&page=2&status=%5B%22open%22%5D');
  });

  it('reads every scalar as text, lists as JSON and old quoted links', () => {
    expect(parseSearch('?q=123&page=2&status=%5B%22open%22%5D&months=%2212%22')).toEqual({
      q: '123',
      page: '2',
      status: ['open'],
      months: '12',
    });
  });

  it('reads back text that looks like JSON or a boolean', () => {
    expect(parseSearch(stringifySearch({ q: '[1]', flag: 'true' }))).toEqual({ q: '[1]', flag: 'true' });
  });
});
