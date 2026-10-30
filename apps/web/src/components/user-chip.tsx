import { Avatar, AvatarFallback, AvatarImage } from '@ethica/ui/components/avatar';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { apiUrl } from '@/lib/api/client.api.js';
import { initials } from '@/lib/helpers/initials.helper.js';
import { cn } from '@/lib/utils.js';
import { usersQuery } from '@/query/user.js';

type UserAvatarProps = Omit<ComponentProps<typeof Avatar>, 'children'> & {
  name: string;
  // Caminho versionado da foto (GET /auth/users/:id/avatar?v=…); sem ele, iniciais.
  avatar?: string;
  // Sem `avatar`, procura a foto da pessoa no diretório do tenant (`usersQuery`,
  // já em cache para os filtros) — as listas só têm `assignee` + `assigneeName`.
  userId?: string;
};

// Foto da pessoa com as iniciais por baixo: o fallback aparece sem foto e
// enquanto a imagem carrega ou se ela falhar.
export function UserAvatar({ name, avatar, userId, ...props }: UserAvatarProps) {
  const users = useQuery({ ...usersQuery, enabled: Boolean(userId) && !avatar });
  const src = avatar ?? users.data?.find((user) => user.id === userId)?.avatar;
  return (
    <Avatar {...props}>
      {src && <AvatarImage src={apiUrl(src)} alt={name} />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

// Responsável de um item (ACC-07), a partir do `@reui/c-avatar-25`: pílula com
// borda, avatar e o nome no lugar da contagem.
export function UserChip({ userId, name, className }: { userId: string; name: string; className?: string }) {
  return (
    <span
      data-slot="user-chip"
      title={name}
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border p-0.5 shadow-sm shadow-black/5',
        className,
      )}
    >
      <UserAvatar name={name} userId={userId} size="sm" className="border-2 border-background" />
      <ItemDescription className="me-1.5 line-clamp-1 text-xs">{name}</ItemDescription>
    </span>
  );
}
