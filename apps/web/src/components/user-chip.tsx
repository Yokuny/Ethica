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
  // Versioned photo path (GET /auth/users/:id/avatar?v=…); without it, initials.
  avatar?: string;
  // Without `avatar`, looks up the person's photo in the tenant directory (`usersQuery`,
  // already cached for the filters) — the lists only have `assignee` + `assigneeName`.
  userId?: string;
};

// Person's photo with the initials underneath: the fallback shows without a photo and
// while the image loads or if it fails.
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

// Item assignee (ACC-07), from `@reui/c-avatar-25`: bordered pill with
// the avatar and the name in place of the count.
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
