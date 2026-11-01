import type { ColumnDef } from '@tanstack/react-table';
import { AppLink } from '@/components/app-link.js';
import { TableStack } from '@/components/data-table.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { DIARIO_ACAO_KEY, DIARIO_MODULO_KEY, DIARIO_RECURSO_KEY } from '../@consts/diario-labels.js';
import type { Atividade } from '../@query/diario.js';

// Módulos com tela de detalhe: o registro vira link enquanto existir.
const DETALHE = {
  pericias: '/pericias/details',
  partes: '/partes/details',
  laudos: '/laudos/details',
  modelos: '/laudos/modelos/details',
} as const;

function Registro({ atividade }: { atividade: Atividade }) {
  const texto = atividade.rotulo ?? (atividade.registroId ? t('record') : '—');
  const destino = atividade.modulo in DETALHE ? DETALHE[atividade.modulo as keyof typeof DETALHE] : undefined;
  if (!destino || !atividade.registroId) return <TableStack>{texto}</TableStack>;
  return (
    <AppLink to={destino} search={{ id: atividade.registroId }}>
      {texto}
    </AppLink>
  );
}

export const diarioColumns: ColumnDef<Atividade, unknown>[] = [
  {
    id: 'quando',
    header: t('when'),
    cell: ({ row }) => <TableStack>{formatDateTime(row.original.createdAt)}</TableStack>,
  },
  { id: 'quem', header: t('user'), cell: ({ row }) => <TableStack>{row.original.userName}</TableStack> },
  {
    id: 'acao',
    header: t('action'),
    cell: ({ row }) => (
      <TableStack
        description={
          row.original.recurso && DIARIO_RECURSO_KEY[row.original.recurso]
            ? t(DIARIO_RECURSO_KEY[row.original.recurso])
            : undefined
        }
      >
        {`${t(DIARIO_MODULO_KEY[row.original.modulo])} · ${t(DIARIO_ACAO_KEY[row.original.acao])}`}
      </TableStack>
    ),
  },
  { id: 'registro', header: t('record'), cell: ({ row }) => <Registro atividade={row.original} /> },
];
