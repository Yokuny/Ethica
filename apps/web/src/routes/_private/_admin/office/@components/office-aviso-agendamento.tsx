import { AVISO_AGENDAMENTO_MARKERS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { DefaultLoading } from '@/components/default-loading.js';
import { TextareaField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useAvisoAgendamentoForm } from '../@hooks/use-aviso-agendamento-form.js';
import { type AvisoAgendamento, avisoAgendamentoQuery } from '../@query/office.js';

function AvisoForm({ aviso }: { aviso: AvisoAgendamento }) {
  const { form, onSubmit, isPending } = useAvisoAgendamentoForm(aviso);
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <div className="grid w-full gap-4">
          <TextField
            control={form.control}
            name="assunto"
            label={t('subject')}
            placeholder={t('notice_subject_placeholder')}
          />
          <TextareaField
            control={form.control}
            name="corpo"
            label={t('message')}
            placeholder={t('notice_body_placeholder')}
          />
          <ItemDescription className="line-clamp-none">
            {t('notice_markers_hint')} {AVISO_AGENDAMENTO_MARKERS.join(' · ')}
          </ItemDescription>
        </div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}

// Modelo do e-mail de aviso de agendamento às partes (AD-131).
export function OfficeAvisoAgendamento() {
  const query = useQuery(avisoAgendamentoQuery);
  if (!query.data) return <DefaultLoading />;
  return <AvisoForm aviso={query.data} />;
}
