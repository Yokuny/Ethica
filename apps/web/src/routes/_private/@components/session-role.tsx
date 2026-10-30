import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { t } from '@/lib/helpers/translate.helper.js';
import type { SessionView } from '@/query/session.js';
export function SessionRole({ roles }: { roles: SessionView['role'] }) {
  return (
    <div className="flex gap-1">
      <ItemDescription>{t('role')}:</ItemDescription>
      <ItemTitle>{roles.map((role) => t(role)).join(', ')}</ItemTitle>
    </div>
  );
}
