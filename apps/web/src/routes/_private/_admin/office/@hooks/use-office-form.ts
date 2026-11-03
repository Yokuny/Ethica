import { type UpdateOffice, updateOfficeSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type OfficeView, updateOfficeMutation } from '../@query/office.js';

const textsOf = ({ header, footer, headerStyle, footerStyle }: OfficeView): UpdateOffice => ({
  header,
  footer,
  headerStyle,
  footerStyle,
});

export function useOfficeForm(office: OfficeView) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updateOfficeMutation(queryClient));
  const form = useForm<UpdateOffice>({
    resolver: zodResolver(updateOfficeSchema),
    defaultValues: textsOf(office),
  });

  function onSubmit(data: UpdateOffice) {
    if (mutation.isPending) return;
    mutation.mutate(data, {
      onSuccess: (saved) => {
        form.reset(textsOf(saved));
        toast.success(t('changes_saved'));
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending };
}
