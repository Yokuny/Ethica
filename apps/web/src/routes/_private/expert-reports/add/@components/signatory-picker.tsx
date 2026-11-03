import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AppLink } from '@/components/app-link.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { SignatoryDialog } from '@/components/signatory-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { profileQuery } from '@/query/account.js';
import { signatoriesQuery } from '@/query/signatory.js';

// Value of the account owner in the list: the report goes without a registered responsible.
export const ACCOUNT_OWNER = 'me';

type SignatoryPickerProps = { value: string; onChange: (value: string) => void };

// NLA-02/NLA-03: who signs the report and their personal data. Another person is registered here
// (data, logo, header and footer), without access to Ethica.
export function SignatoryPicker({ value, onChange }: SignatoryPickerProps) {
  const profile = useQuery(profileQuery);
  const signatories = useQuery(signatoriesQuery);
  const [dialog, setDialog] = useState<'new' | 'edit' | null>(null);
  if (profile.isLoading || signatories.isLoading) return <DefaultLoading />;
  const chosen = signatories.data?.find((signatory) => signatory.id === value);
  const person = chosen ?? profile.data;
  const items = [
    { value: ACCOUNT_OWNER, label: `${profile.data?.name ?? ''} (${t('account_owner')})` },
    ...(signatories.data ?? []).map((signatory) => ({ value: signatory.id, label: signatory.name })),
  ];
  const data = [
    [t('cpf'), person?.cpf],
    [t('professional_registration'), person?.professionalRegistration],
    [t('education'), person?.education],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Select items={items} value={value} onValueChange={(next) => next && onChange(next)}>
          <SelectTrigger className="w-full sm:w-96" aria-label={t('technical_responsible')}>
            <SelectValue placeholder={t('select')} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="field" onClick={() => setDialog('new')}>
          {t('new_technical_responsible')}
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {data.map(([label, amount]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <ItemDescription render={<dt />}>{label}</ItemDescription>
            <ItemDescription render={<dd />} className="text-foreground">
              {amount || t('not_informed')}
            </ItemDescription>
          </div>
        ))}
      </dl>
      {chosen ? (
        <ItemDescription
          render={<button type="button" onClick={() => setDialog('edit')} />}
          className="self-start underline decoration-dashed underline-offset-4 hover:text-foreground"
        >
          {t('edit_personal_data')}
        </ItemDescription>
      ) : (
        <AppLink to="/account" as="description">
          {t('edit_personal_data')}
        </AppLink>
      )}
      {dialog && (
        <SignatoryDialog
          signatory={dialog === 'edit' ? chosen : undefined}
          onClose={() => setDialog(null)}
          onSaved={(saved) => onChange(saved.id)}
        />
      )}
    </div>
  );
}
