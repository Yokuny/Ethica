import { sugerirPeriodoImprescrito } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useFormContext, useWatch } from 'react-hook-form';
import { DateField, TextField } from '@/components/form-fields.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiaFormValues } from '../@interface/pericias.interface.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Dados auxiliares do laudo trabalhista (IMP-04). O período imprescrito é sugerido pelas
// datas do contrato (AD-115); no cadastro a API grava a sugestão se o período ficar vazio.
export function PericiaTrabalhistaFields() {
  const { control, setValue } = useFormContext<PericiaFormValues>();
  const [dataAutuacao, dataAdmissao, dataDemissao, inicio, fim] = useWatch({
    control,
    name: ['dataAutuacao', 'dataAdmissao', 'dataDemissao', 'periodoImprescritoInicio', 'periodoImprescritoFim'],
  });
  const sugerido = sugerirPeriodoImprescrito({
    dataAutuacao: dataAutuacao || undefined,
    dataAdmissao: dataAdmissao || undefined,
    dataDemissao: dataDemissao || undefined,
  });
  const podeSugerir = sugerido && (sugerido.inicio !== inicio || sugerido.fim !== fim);

  function aplicarSugestao() {
    if (!sugerido) return;
    setValue('periodoImprescritoInicio', sugerido.inicio, { shouldDirty: true });
    setValue('periodoImprescritoFim', sugerido.fim, { shouldDirty: true });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <DateField
          control={control}
          name="dataAutuacao"
          label={t('lawsuit_filing_date')}
          placeholder={t('choose_day')}
        />
        <DateField control={control} name="dataAdmissao" label={t('hiring_date')} placeholder={t('choose_day')} />
        <DateField control={control} name="dataDemissao" label={t('termination_date')} placeholder={t('choose_day')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          control={control}
          name="periodoImprescritoInicio"
          label={t('non_prescribed_period_start')}
          placeholder={t('choose_day')}
        />
        <DateField
          control={control}
          name="periodoImprescritoFim"
          label={t('non_prescribed_period_end')}
          placeholder={t('choose_day')}
        />
      </div>
      {podeSugerir && (
        <div className="flex flex-wrap items-center gap-3">
          <ItemDescription className="line-clamp-none">
            {`${t('suggested_period')}: ${day(sugerido.inicio)} – ${day(sugerido.fim)}`}
          </ItemDescription>
          <Button type="button" variant="outline" onClick={aplicarSugestao}>
            {t('use_suggested_period')}
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={control}
          name="funcaoReclamante"
          label={t('claimant_job')}
          placeholder={t('example_claimant_job')}
        />
        <TextField
          control={control}
          name="localPericia"
          label={t('inspection_address')}
          placeholder={t('example_address')}
        />
      </div>
    </div>
  );
}
