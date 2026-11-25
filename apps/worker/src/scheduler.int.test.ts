import { connect, disconnect, syncWorkerIndexes, WorkerJob } from '@ethica/db';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { scheduleTick } from './scheduler.js';

describe('agendador do worker', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
    await syncWorkerIndexes();
  });
  afterEach(async () => {
    await WorkerJob.deleteMany({});
  });
  afterAll(async () => {
    await disconnect();
  });

  it('a consulta ao Datajud começa às 05:00 de Brasília, uma vez por dia (AD-303)', async () => {
    expect(await scheduleTick(new Date('2026-11-25T07:59:00.000Z'))).not.toContain('court_refresh');
    expect(await scheduleTick(new Date('2026-11-25T08:00:00.000Z'))).toContain('court_refresh');
    expect(await scheduleTick(new Date('2026-11-25T12:00:00.000Z'))).not.toContain('court_refresh');
  });
});
