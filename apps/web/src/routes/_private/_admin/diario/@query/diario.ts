import type { DiarioAcao, DiarioModulo } from '@ethica/contracts';
import { queryOptions } from '@tanstack/react-query';
import { get } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { DiarioSearch } from '../@interface/diario.interface.js';

// Espelha AtividadeRecord de apps/api/src/modules/identity/diario.schema.ts (AD-134).
export type Atividade = {
  id: string;
  userId: string;
  userName: string;
  modulo: DiarioModulo;
  recurso?: string;
  acao: DiarioAcao;
  registroId?: string;
  rotulo?: string;
  createdAt: string;
};

export const diarioQuery = (search: DiarioSearch) =>
  queryOptions({
    queryKey: ['diario', search] as const,
    queryFn: async (): Promise<{ items: Atividade[]; total: number }> => {
      const params = new URLSearchParams(
        Object.entries(search).flatMap(([key, value]) =>
          value === undefined || value === '' ? [] : [[key, String(value)]],
        ),
      );
      const res = await get<{ items: Atividade[]; total: number }>(`/tenant/diario?${params}`);
      if (!res.success || !res.data) throw new Error(res.message ?? t('load_error'));
      return res.data;
    },
  });
