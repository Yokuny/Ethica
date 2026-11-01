import { PERFIL_PERMISSOES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { CardAction, CardContent, CardFooter, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PermissoesMatrix } from '../../@components/permissoes-matrix.js';
import { INVITE_ROLES } from '../@consts/roles.js';
import { useInviteForm } from '../@hooks/use-invite-form.js';
export function InviteForm() {
  const { form, notice, errorMessage, isPending, onSubmit } = useInviteForm();
  const role = form.watch('role');
  const formActions = (
    <Button type="submit" disabled={isPending}>
      {t('send_invitation')}
    </Button>
  );
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="contents">
        <CardHeader title={t('invite_person')}>
          <CardAction>{formActions}</CardAction>
        </CardHeader>
        <CardContent>
          <DefaultFormLayout
            sections={[
              {
                title: t('invite_person'),
                description: t('choose_role_and_send_access_link'),
                fields: [
                  <FormField
                    key="email"
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('email')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('email')} autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />,
                  <FormField
                    key="role"
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('role')}</FormLabel>
                        <Select
                          items={INVITE_ROLES.map((value) => ({ value, label: t(value) }))}
                          value={field.value}
                          onValueChange={(role) => {
                            field.onChange(role);
                            // Trocar o perfil traz o preset dele; o admin ajusta depois.
                            if (role && role !== 'admin') form.setValue('permissoes', PERFIL_PERMISSOES[role]);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INVITE_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {t(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />,
                ],
              },
              ...(role === 'admin'
                ? []
                : [
                    {
                      title: t('permissions'),
                      description: t('permissions_invite_description'),
                      fields: [
                        <PermissoesMatrix
                          key="permissoes"
                          value={form.watch('permissoes') ?? {}}
                          onChange={(permissoes) => form.setValue('permissoes', permissoes)}
                        />,
                      ],
                    },
                  ]),
            ]}
          />
          {errorMessage && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {errorMessage}
            </ItemDescription>
          )}
          {notice && (
            <ItemDescription role="status" className="text-inherit line-clamp-none">
              {notice}
            </ItemDescription>
          )}
        </CardContent>
        <CardFooter>
          <CardAction>{formActions}</CardAction>
        </CardFooter>
      </form>
    </Form>
  );
}
