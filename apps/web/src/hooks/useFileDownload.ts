import { useState } from 'react';
import { toast } from 'sonner';
import { getFile } from '@/lib/api/client.api.js';

// Downloads a file of the API (PDF, ZIP, attachment; `filename` keeps a name with accents). `pending` is the path in progress, to
// lock only that document's button; an error becomes a toast with the translated message.
export function useFileDownload() {
  const [pending, setPending] = useState<string | null>(null);

  async function download(path: string, filename?: string) {
    if (pending) return;
    setPending(path);
    const res = await getFile(path);
    setPending(null);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    const url = URL.createObjectURL(res.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename ?? res.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return { download, pending };
}
