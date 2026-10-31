import { useState } from 'react';
import { toast } from 'sonner';
import { getFile } from '@/lib/api/client.api.js';

// Baixa um documento gerado pela API (PDF, ZIP). `pending` é o caminho em andamento, para
// travar só o botão daquele documento; erro vira toast com a mensagem traduzida.
export function useFileDownload() {
  const [pending, setPending] = useState<string | null>(null);

  async function download(path: string) {
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
    link.download = res.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return { download, pending };
}
