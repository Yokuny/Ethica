import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Reads the real .env.example to prove it covers 100% of the keys that
// este envSchema exige.
const parseDotEnvExample = (): Record<string, string> => {
  const path = join(__dirname, '../../../../.env.example');
  const content = readFileSync(path, 'utf-8');
  const entries: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    entries[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }
  return entries;
};

const requiredKeys = ['MONGODB_URI', 'API_PORT', 'SESSION_JWT_SECRET', 'CORS_ORIGIN'];

describe('parseEnv', () => {
  it('parses successfully when .env.example provides every key envSchema requires', () => {
    const fromExample = parseDotEnvExample();
    expect(() => parseEnv(fromExample)).not.toThrow();
  });

  it.each(requiredKeys)('fails naming %s in the error message when it is missing', (key) => {
    const fromExample = parseDotEnvExample();
    delete fromExample[key];
    expect(() => parseEnv(fromExample)).toThrowError(new RegExp(key));
  });
});
