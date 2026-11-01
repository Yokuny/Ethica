import { type FinanceReportQuery, financeReportQuerySchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useFileDownload } from '@/hooks/useFileDownload.js';
import { formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';

// Default period: from the first day of the month to today.
export function useFinanceReportForm() {
  const today = formatDisplayDate(new Date());
  const form = useForm<FinanceReportQuery>({
    resolver: zodResolver(financeReportQuerySchema),
    defaultValues: { from: `${today.slice(0, 8)}01`, to: today },
  });
  const { download, pending } = useFileDownload();

  function onSubmit({ from, to }: FinanceReportQuery) {
    download(`/documents/finance?from=${from}&to=${to}`);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: Boolean(pending) };
}
