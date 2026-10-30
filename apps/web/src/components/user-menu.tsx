import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@ethica/ui/components/sidebar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronsUpDown, LogOut, Type, UserRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/user-chip.js';
import { TextSizeOptions } from '@/components/user-menu.text-size.js';
import { post } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type SessionView, sessionKeys } from '@/query/session.js';

// O conteúdo (sessão via cache, mutation de logout) só monta com o menu
// aberto: os testes de página renderizam o shell sem QueryClientProvider e
// nunca abrem o menu.
function UserMenuContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = queryClient.getQueryData<SessionView>(sessionKeys.detail());

  const signoutMutation = useMutation({
    mutationFn: async () => {
      const res = await post('/auth/signout');
      if (!res.success) throw new Error(res.message ?? t('action_error'));
    },
    onSuccess: () => {
      // Dados do tenant/usuário anterior não podem sobreviver no cache.
      queryClient.clear();
      navigate({ to: '/auth' });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      {session && (
        <>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col items-start gap-0.5 py-2">
              <ItemTitle>{session.user.name}</ItemTitle>
              <ItemDescription className="line-clamp-none">{session.user.email}</ItemDescription>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem render={<Link to="/account" />}>
        <UserRound />
        {t('my_account')}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Type />
          {t('text_size')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <TextSizeOptions />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem variant="destructive" onClick={() => signoutMutation.mutate()}>
        <LogOut />
        {t('sign_out')}
      </DropdownMenuItem>
    </>
  );
}

// Usuário no rodapé da sidebar: conta, tamanho do texto e sair.
export function UserMenu({ name, avatar }: { name: string; avatar?: string }) {
  const [open, setOpen] = useState(false);
  const { isMobile, state } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                variant={isMobile || state === 'expanded' ? 'outline' : 'default'}
                size="lg"
                tooltip={name}
                aria-label={t('account')}
                className="group-data-[collapsible=icon]:justify-center"
              />
            }
          >
            <UserAvatar name={name} avatar={avatar} size="sm" />
            <ItemDescription className="text-inherit line-clamp-1 flex-1 group-data-[collapsible=icon]:hidden">
              {name}
            </ItemDescription>
            <ChevronsUpDown aria-hidden className="ml-auto group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            {open && <UserMenuContent />}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
