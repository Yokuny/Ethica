import crypto from 'node:crypto';
import type { Role } from '@ethica/contracts';
import { connect, disconnect, User } from '@ethica/db';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as authRepository from './auth.repository.js';

// No `mongoose` here (AD-010/structural boundary: only packages/db imports
// mongoose) — same pattern as customer.repository.int.test.ts.
const randomId = (): string => crypto.randomBytes(12).toString('hex');

const baseUser = (tenant: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  name: 'Fulano de Tal',
  email: `user-${randomId()}@empresa.com`,
  password: 'hash',
  Tenant: tenant,
  role: ['operator'] as Role[],
  ...overrides,
});

// MOD-07 (T13): batch read consumed by order.service.getOrder
// (approvedByName/rejectedByName) — a single `$in` query, reference
// missing becomes a missing item (never `null`).
describe('auth.repository.findUserNamesByIds', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await disconnect();
  });

  it('returns {id, name} for every existing id of the tenant, in one batch', async () => {
    const tenant = randomId();
    const ana = await User.create(baseUser(tenant, { name: 'Ana' }));
    const bruno = await User.create(baseUser(tenant, { name: 'Bruno' }));

    const result = await authRepository.findUserNamesByIds(tenant, [ana._id.toString(), bruno._id.toString()]);

    expect(result).toEqual(
      expect.arrayContaining([
        { id: ana._id.toString(), name: 'Ana' },
        { id: bruno._id.toString(), name: 'Bruno' },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it('excludes an id with no matching User from the result, instead of a null/undefined item', async () => {
    const tenant = randomId();

    const result = await authRepository.findUserNamesByIds(tenant, [randomId()]);

    expect(result).toEqual([]);
  });

  it('never includes a User belonging to a DIFFERENT tenant, even when its id is asked for (AD-010)', async () => {
    const tenant = randomId();
    const other = await User.create(baseUser(randomId(), { name: 'De Outro Tenant' }));

    const result = await authRepository.findUserNamesByIds(tenant, [other._id.toString()]);

    expect(result).toEqual([]);
  });

  it('resolves an empty array without querying the collection when there is no id', async () => {
    const findSpy = vi.spyOn(User, 'find');

    expect(await authRepository.findUserNamesByIds(randomId(), [])).toEqual([]);
    expect(findSpy).not.toHaveBeenCalled();

    findSpy.mockRestore();
  });
});

// Full tenant directory, used by the "assignee" filter of the conversation
// queue (inbox) — unlike findUserNamesByIds, it takes no ids:
// returns EVERY User of the tenant, to populate a <Select> from scratch.
describe('auth.repository.listUsers', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await disconnect();
  });

  it('returns every User of the tenant, sorted by name', async () => {
    const tenant = randomId();
    await User.create(baseUser(tenant, { name: 'Zeca' }));
    await User.create(baseUser(tenant, { name: 'Ana' }));

    const result = await authRepository.listUsers(tenant);

    expect(result).toEqual([
      { id: expect.any(String), name: 'Ana' },
      { id: expect.any(String), name: 'Zeca' },
    ]);
  });

  it('never includes a User belonging to a DIFFERENT tenant (AD-010)', async () => {
    const tenant = randomId();
    await User.create(baseUser(randomId(), { name: 'De Outro Tenant' }));

    expect(await authRepository.listUsers(tenant)).toEqual([]);
  });

  it('returns an empty array for a tenant with no Users', async () => {
    expect(await authRepository.listUsers(randomId())).toEqual([]);
  });
});

// MOD-04/MOD-05 (T21): card.service.assertReferencesExist confirma a
// a User's existence (assignee) only through here, never with `User.exists`
// direto.
describe('auth.repository.userExists', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await disconnect();
  });

  it('returns true for a User that belongs to the tenant', async () => {
    const tenant = randomId();
    const user = await User.create(baseUser(tenant));

    expect(await authRepository.userExists(tenant, user._id.toString())).toBe(true);
  });

  it('returns false for an id with no matching User', async () => {
    expect(await authRepository.userExists(randomId(), randomId())).toBe(false);
  });

  it('returns false for a User belonging to a DIFFERENT tenant (AD-010)', async () => {
    const other = await User.create(baseUser(randomId()));

    expect(await authRepository.userExists(randomId(), other._id.toString())).toBe(false);
  });
});
