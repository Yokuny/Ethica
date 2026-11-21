import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';

// A code to paste in the bank app (PIX copia e cola, boleto line), with the copy button.
export function CopyField({ label, value }: { label: string; value: string }) {
  const copy = () => void navigator.clipboard.writeText(value).then(() => toast.success(t('copied')));
  return (
    <div className="flex flex-col gap-2">
      <ItemDescription>{label}</ItemDescription>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
        <code className="min-w-0 flex-1 break-all text-xs">{value}</code>
        <Button size="sm" onClick={copy}>
          <CopyIcon />
          {t('copy')}
        </Button>
      </div>
    </div>
  );
}
