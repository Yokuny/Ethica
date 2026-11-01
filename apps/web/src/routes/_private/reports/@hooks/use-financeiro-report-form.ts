import { type FinanceiroReportQuery, financeiroReportQuerySchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';

// Período padrão: do primeiro dia do mês até hoje.
export function useFinanceiroReportForm() {
  const today = formatDisplayDate(new Date());
  const form = useForm<FinanceiroReportQuery>({
    resolver: zodResolver(financeiroReportQuerySchema),
    defaultValues: { from: `${today.slice(0, 8)}01`, to: today },
  });
  const { download, pending } = useFileDownload();

  function onSubmit({ from, to }: FinanceiroReportQuery) {
    download(`/documents/finance?from=${from}&to=${to}`);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: Boolean(pending) };
}
