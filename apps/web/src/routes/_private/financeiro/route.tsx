import type { QueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { canSeeFinance, sessionQuery } from '@/query/session.js';

// Guarda binária do financeiro: mesmos papéis do router da API (admin/manager).
// A sessão já está no cache (ensureQueryData de _private/route.tsx).
export const beforeLoad = async ({ context }: { context: { queryClient: QueryClient } }): Promise<void> => {
  const session = await context.queryClient.ensureQueryData(sessionQuery);
  if (!canSeeFinance(session)) throw redirect({ to: '/' });
};

export const Route = createFileRoute('/_private/financeiro')({ beforeLoad });
