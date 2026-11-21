import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ethica/ui/components/dialog';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ChevronRightIcon } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import { BILLING_METHODS, type BillingMethod } from '../@consts/methods.js';

type BillingMethodDialogProps = {
  planName?: string;
  disabled: boolean;
  onClose: () => void;
  onChoose: (method: BillingMethod) => void;
};

// CHK-11: the trial and the single month ask how to pay; open while `planName` is set.
export function BillingMethodDialog({ planName, disabled, onClose, onChoose }: BillingMethodDialogProps) {
  return (
    <Dialog open={Boolean(planName)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('billing_method_title')}</DialogTitle>
          <DialogDescription>{planName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {BILLING_METHODS.map((option) => (
            <button
              key={option.method}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(option.method)}
              className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              <option.icon className="size-5 shrink-0 text-primary" aria-hidden />
              <div className="flex flex-1 flex-col gap-0.5">
                <ItemTitle>{option.name}</ItemTitle>
                <ItemDescription className="line-clamp-none">{option.help}</ItemDescription>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
