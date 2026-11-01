import { z } from 'zod';

// Listing overview: tenant total and count per group (status,
// lifecycle, deadline slice). Feeds the indicator strip of the list
// screens; `key` is the group key, the label is translated by the web.
const trendSchema = z.object({
  series: z.array(z.number().int().min(0)),
  direction: z.enum(['up', 'down', 'stable']),
  changePercent: z.number().nullable(),
  comparison: z.object({ current: z.number().min(0), previous: z.number().min(0), delta: z.number() }),
});

export const listStatsSchema = z.object({
  total: z.number().int().min(0),
  groups: z.array(z.object({ key: z.string(), count: z.number().int().min(0), trend: trendSchema.optional() })),
  trend: trendSchema.optional(),
});

export type ListStats = z.infer<typeof listStatsSchema>;
export type ListStatsTrend = z.infer<typeof trendSchema>;
