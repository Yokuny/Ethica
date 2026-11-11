import { type FinanceReportQuery, financeReportQuerySchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const pathOf = ({ from, to }: FinanceReportQuery) => `/documents/finance?from=${from}&to=${to}`;

  return {
    form,
    onSubmit: form.handleSubmit((period) => download(pathOf(period))),
    onPreview: form.handleSubmit((period) => setPreviewPath(pathOf(period))),
    previewPath,
    closePreview: () => setPreviewPath(null),
    download,
    isPending: Boolean(pending),
  };
}
