import { z } from 'zod';

// Panorama de uma listagem: total do tenant e contagem por grupo (status,
// ciclo de vida, recorte de prazo). Alimenta a faixa de indicadores das telas
// de lista; `key` é a chave do grupo, o rótulo é traduzido pela web.
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
