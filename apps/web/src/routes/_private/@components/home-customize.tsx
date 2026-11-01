import type { HomeBlock } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Checkbox } from '@/components/checkbox.js';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { updatePreferencesMutation } from '@/query/preferences.js';
import { HOME_BLOCK_KEY } from '../@consts/home-blocks.js';

// "Personalizar" do início (GES-04): cada bloco que o papel pode ver liga e desliga na hora;
// "Restaurar padrão" mostra todos de novo. Grava por usuário (AD-136).
export function HomeCustomize({
  blocks,
  hidden,
  onClose,
}: {
  blocks: HomeBlock[];
  hidden: HomeBlock[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updatePreferencesMutation(queryClient));
  const salvar = (hiddenBlocks: HomeBlock[]) =>
    mutation.mutate({ hiddenBlocks }, { onError: (error: Error) => toast.error(error.message) });

  return (
    <FormDialog size="sm" title={t('customize_home')} description={t('customize_home_description')} onClose={onClose}>
      <div className="grid gap-3">
        {blocks.map((block) => (
          <Checkbox
            key={block}
            label={t(HOME_BLOCK_KEY[block])}
            checked={!hidden.includes(block)}
            disabled={mutation.isPending}
            onCheckedChange={(checked) =>
              salvar(checked ? hidden.filter((item) => item !== block) : [...hidden, block])
            }
          />
        ))}
      </div>
      {!blocks.length && <ItemDescription>{t('nothing_to_customize')}</ItemDescription>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending || !hidden.length}
          onClick={() => salvar([])}
        >
          {t('restore_default')}
        </Button>
        <Button type="button" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </FormDialog>
  );
}
