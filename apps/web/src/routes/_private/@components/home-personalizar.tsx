import type { HomeBloco } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Checkbox } from '@/components/checkbox.js';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { updatePreferencesMutation } from '@/query/preferences.js';
import { HOME_BLOCO_KEY } from '../@consts/home-blocos.js';

// "Personalizar" do início (GES-04): cada bloco que o papel pode ver liga e desliga na hora;
// "Restaurar padrão" mostra todos de novo. Grava por usuário (AD-136).
export function HomePersonalizar({
  blocos,
  ocultos,
  onClose,
}: {
  blocos: HomeBloco[];
  ocultos: HomeBloco[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updatePreferencesMutation(queryClient));
  const salvar = (blocosOcultos: HomeBloco[]) =>
    mutation.mutate({ blocosOcultos }, { onError: (error: Error) => toast.error(error.message) });

  return (
    <FormDialog size="sm" title={t('customize_home')} description={t('customize_home_description')} onClose={onClose}>
      <div className="grid gap-3">
        {blocos.map((bloco) => (
          <Checkbox
            key={bloco}
            label={t(HOME_BLOCO_KEY[bloco])}
            checked={!ocultos.includes(bloco)}
            disabled={mutation.isPending}
            onCheckedChange={(checked) =>
              salvar(checked ? ocultos.filter((item) => item !== bloco) : [...ocultos, bloco])
            }
          />
        ))}
      </div>
      {!blocos.length && <ItemDescription>{t('nothing_to_customize')}</ItemDescription>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending || !ocultos.length}
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
