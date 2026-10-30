import type { Model } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { dailyTrend } from './dailyTrend.js';

const tenantId = '507f1f77bcf86cd799439011';
const now = new Date('2026-10-17T15:00:00.000Z');

const fakeModel = (rows: { _id: string; count: number }[]) => {
  const aggregate = vi.fn().mockResolvedValue(rows);
  return { model: { aggregate } as unknown as Model<{ createdAt: Date }>, aggregate };
};

describe('dailyTrend', () => {
  it('compara 30 dias com os 30 anteriores, preenchendo dias sem evento', async () => {
    const { model } = fakeModel([
      { _id: '2026-09-17', count: 3 },
      { _id: '2026-10-16', count: 4 },
      { _id: '2026-10-17', count: 2 },
    ]);

    const trend = await dailyTrend(model, tenantId, 'createdAt', {}, 'period', now);

    expect(trend).toMatchObject({
      direction: 'up',
      changePercent: 100,
      comparison: { current: 6, previous: 3, delta: 3 },
    });
    expect(trend.series).toHaveLength(30);
    expect(trend.series.slice(-2)).toEqual([4, 2]);
    expect(trend.series.slice(0, -2).every((count) => count === 0)).toBe(true);
  });

  it('compara hoje com a média dos 30 dias anteriores e limita a agregação ao tenant', async () => {
    const { model, aggregate } = fakeModel([
      { _id: '2026-10-16', count: 30 },
      { _id: '2026-10-17', count: 2 },
    ]);

    const trend = await dailyTrend(model, tenantId, 'createdAt', { status: 'completed' }, 'daily-average', now);

    expect(trend).toMatchObject({
      direction: 'up',
      changePercent: 100,
      comparison: { current: 2, previous: 1, delta: 1 },
    });
    const match = aggregate.mock.calls[0]?.[0]?.[0]?.$match;
    expect(match.Tenant.toString()).toBe(tenantId);
    expect(match.status).toBe('completed');
    expect(match.createdAt).toEqual({
      $gte: new Date('2026-08-19T03:00:00.000Z'),
      $lt: new Date('2026-10-18T03:00:00.000Z'),
    });
  });

  it('não cria percentual quando a base de comparação é zero', async () => {
    const { model } = fakeModel([{ _id: '2026-10-17', count: 1 }]);

    const trend = await dailyTrend(model, tenantId, 'createdAt', {}, 'daily-average', now);

    expect(trend).toMatchObject({
      direction: 'up',
      changePercent: null,
      comparison: { current: 1, previous: 0, delta: 1 },
    });
  });
});
