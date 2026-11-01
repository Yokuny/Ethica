import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ethica/ui/components/dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import type { ReactNode } from 'react';

// REG-11 (AD-070): create/edit/act on a record without pushing the page.
// Mounted = open: the user renders it conditionally from its own state
// (`panel`) and gets `onClose` on Esc, on click outside and on ✕. The body scrolls
// inside the dialog when it goes past the screen height.
const formDialogVariants = cva('max-h-[calc(100dvh-2rem)] overflow-y-auto', {
  variants: {
    size: {
      sm: 'sm:max-w-md',
      md: 'sm:max-w-xl',
      lg: 'sm:max-w-3xl',
    },
  },
  defaultVariants: { size: 'md' },
});

type FormDialogProps = VariantProps<typeof formDialogVariants> & {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function FormDialog({ title, description, size, onClose, children }: FormDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={cn(formDialogVariants({ size }))}>
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
