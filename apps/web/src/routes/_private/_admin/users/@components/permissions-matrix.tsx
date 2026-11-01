import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionModule,
  type Permissions,
} from '@ethica/contracts';
import { ItemTitle } from '@ethica/ui/components/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ethica/ui/components/table';
import { Checkbox } from '@/components/checkbox.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PERMISSION_ACTION_KEY, PERMISSION_MODULE_KEY } from '../@consts/permissions-labels.js';

// Matriz módulo × ação do membro (AD-137), no convite e em Usuários. Marcar inserir, editar
// ou excluir marca ver; desmarcar ver limpa a linha (a API recusa ação sem ver).
export function togglePermission(
  permissions: Permissions,
  module: PermissionModule,
  action: PermissionAction,
  checked: boolean,
): Permissions {
  const current = new Set(permissions[module] ?? []);
  if (checked) {
    current.add(action);
    current.add('view');
  } else if (action === 'view') {
    current.clear();
  } else {
    current.delete(action);
  }
  return { ...permissions, [module]: PERMISSION_ACTIONS.filter((item) => current.has(item)) };
}

export function PermissionsMatrix({
  value,
  onChange,
  disabled,
}: {
  value: Permissions;
  onChange: (permissions: Permissions) => void;
  disabled?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('module')}</TableHead>
          {PERMISSION_ACTIONS.map((action) => (
            <TableHead key={action}>{t(PERMISSION_ACTION_KEY[action])}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {PERMISSION_MODULES.map((module) => (
          <TableRow key={module}>
            <TableCell>
              <ItemTitle>{t(PERMISSION_MODULE_KEY[module])}</ItemTitle>
            </TableCell>
            {PERMISSION_ACTIONS.map((action) => (
              <TableCell key={action}>
                <Checkbox
                  aria-label={`${t(PERMISSION_MODULE_KEY[module])}: ${t(PERMISSION_ACTION_KEY[action])}`}
                  checked={value[module]?.includes(action) ?? false}
                  disabled={disabled}
                  onCheckedChange={(checked) => onChange(togglePermission(value, module, action, checked === true))}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
