import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api/client.api.js';
import { initials } from '@/lib/helpers/initials.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { UserDirectoryEntry } from '../@query/user-directory.js';
import { PermissionsDialog } from './permissions-dialog.js';

// REG-08: o time no layout Team 1 do Tailark Dusk. Uma grade só, gestores
// primeiro; cada pessoa tem o papel como título acima do bloco quadrado (foto da
// conta ou iniciais, ACC-09), nome e e-mail com botão de copiar. Sem tela de detalhe de usuário, os blocos são
// estáticos.
// Feedback do clique: o ícone troca de Copy para Check (escala + opacidade +
// blur) e volta sozinho; o botão afunda um pouco enquanto pressionado.
const COPIED_MS = 1500;
const ICON_SWAP = 'absolute transition-[opacity,transform,filter] duration-200 ease-out';

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(t('copied'));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      toast.error(t('action_error'));
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="relative shrink-0 transition-transform duration-150 active:scale-90 motion-reduce:transition-none"
      aria-label={t('copy_email')}
      onClick={handleCopy}
    >
      <Copy
        aria-hidden="true"
        className={`${ICON_SWAP} ${copied ? 'scale-50 opacity-0 blur-[2px]' : 'scale-100 opacity-100 blur-0'}`}
      />
      <Check
        aria-hidden="true"
        className={`${ICON_SWAP} ${copied ? 'scale-100 opacity-100 blur-0' : 'scale-50 opacity-0 blur-[2px]'}`}
      />
      <span aria-hidden="true" className="size-3.5" />
    </Button>
  );
}

function UserCard({ user, featured }: { user: UserDirectoryEntry; featured: boolean }) {
  const [ajustando, setAjustando] = useState(false);
  return (
    <div className="group min-w-0" data-testid={featured ? 'featured-user' : undefined}>
      <ItemDescription className="line-clamp-1 pb-3 text-xs font-medium tracking-wide opacity-50 uppercase">
        {[...user.role.map((role) => t(role)), ...(user.active ? [] : [t('inactive')])].join(' · ')}
      </ItemDescription>
      <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden transition-all duration-200 [clip-path:inset(0_0_0_0_round_12px)] group-hover:[clip-path:inset(0_0_4px_0_round_16px)]">
        {user.avatar ? (
          <img src={apiUrl(user.avatar)} alt={user.name} className="size-full object-cover" />
        ) : (
          <ItemDescription className="text-4xl font-medium">{initials(user.name)}</ItemDescription>
        )}
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-1 pt-3">
        <ItemTitle>{user.name}</ItemTitle>
        <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden">
          <ItemDescription
            className="line-clamp-none block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
            title={user.email}
          >
            {user.email}
          </ItemDescription>
          <CopyEmailButton email={user.email} />
        </div>
        {/* Admin tem tudo e não tem matriz (AD-137). */}
        {!user.role.includes('admin') && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-self-start"
            onClick={() => setAjustando(true)}
          >
            <ShieldCheck aria-hidden="true" />
            {t('permissions')}
          </Button>
        )}
      </div>
      {ajustando && <PermissionsDialog user={user} onClose={() => setAjustando(false)} />}
    </div>
  );
}

export function UsersList({ users }: { users: UserDirectoryEntry[] }) {
  const isManager = (user: UserDirectoryEntry) => user.role.includes('manager');
  const sorted = [...users.filter(isManager), ...users.filter((user) => !isManager(user))];
  return (
    <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
      {sorted.map((user) => (
        <UserCard key={user.id} user={user} featured={isManager(user)} />
      ))}
    </div>
  );
}
