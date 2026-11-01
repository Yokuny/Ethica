import { wallClockToUtc } from '@ethica/db';
import * as diarioRepository from './diario.repository.js';
import type { ListDiarioQuery, NovaAtividade } from './diario.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Nunca derruba a ação de quem gerou a entrada (GES-01.4): a falha só vai ao log.
export const registrar = async (atividade: NovaAtividade): Promise<void> => {
  try {
    await diarioRepository.registrar(atividade);
  } catch (e) {
    console.error(
      JSON.stringify({ event: 'diario.registrar_failed', message: e instanceof Error ? e.message : String(e) }),
    );
  }
};

// `from`/`to` são dias de calendário (AD-103), inclusivos: o fim vai até o início do dia seguinte.
export const listAtividades = (tenantId: string, query: ListDiarioQuery) =>
  diarioRepository.listAtividades(tenantId, query, {
    from: query.from ? wallClockToUtc(query.from, '00:00') : undefined,
    to: query.to ? new Date(wallClockToUtc(query.to, '00:00').getTime() + DAY_MS) : undefined,
  });

export const ultimasExportacoes = (tenantId: string, limit: number) =>
  diarioRepository.ultimasExportacoes(tenantId, limit);
