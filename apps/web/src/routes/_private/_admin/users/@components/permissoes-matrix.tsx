import {
  PERMISSAO_ACOES,
  PERMISSAO_MODULOS,
  type PermissaoAcao,
  type PermissaoModulo,
  type Permissoes,
} from '@ethica/contracts';
import { ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { Checkbox } from '@/components/checkbox.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PERMISSAO_ACAO_KEY, PERMISSAO_MODULO_KEY } from '../@consts/permissoes-labels.js';

// Matriz módulo × ação do membro (AD-137), no convite e em Usuários. Marcar inserir, editar
// ou excluir marca ver; desmarcar ver limpa a linha (a API recusa ação sem ver).
export function alternarPermissao(
  permissoes: Permissoes,
  modulo: PermissaoModulo,
  acao: PermissaoAcao,
  marcado: boolean,
): Permissoes {
  const atuais = new Set(permissoes[modulo] ?? []);
  if (marcado) {
    atuais.add(acao);
    atuais.add('view');
  } else if (acao === 'view') {
    atuais.clear();
  } else {
    atuais.delete(acao);
  }
  return { ...permissoes, [modulo]: PERMISSAO_ACOES.filter((item) => atuais.has(item)) };
}

export function PermissoesMatrix({
  value,
  onChange,
  disabled,
}: {
  value: Permissoes;
  onChange: (permissoes: Permissoes) => void;
  disabled?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('module')}</TableHead>
          {PERMISSAO_ACOES.map((acao) => (
            <TableHead key={acao}>{t(PERMISSAO_ACAO_KEY[acao])}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {PERMISSAO_MODULOS.map((modulo) => (
          <TableRow key={modulo}>
            <TableCell>
              <ItemTitle>{t(PERMISSAO_MODULO_KEY[modulo])}</ItemTitle>
            </TableCell>
            {PERMISSAO_ACOES.map((acao) => (
              <TableCell key={acao}>
                <Checkbox
                  aria-label={`${t(PERMISSAO_MODULO_KEY[modulo])}: ${t(PERMISSAO_ACAO_KEY[acao])}`}
                  checked={value[modulo]?.includes(acao) ?? false}
                  disabled={disabled}
                  onCheckedChange={(marcado) => onChange(alternarPermissao(value, modulo, acao, marcado === true))}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
