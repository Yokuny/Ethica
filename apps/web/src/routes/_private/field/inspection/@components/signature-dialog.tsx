import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useRef, useState } from 'react';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';

type SignatureDialogProps = { name: string; onConfirm: (png: Blob) => Promise<void>; onClose: () => void };

// Assinatura desenhada na tela (CAM-06, AD-129): vira PNG e vai para a fila de mídias.
export function SignatureDialog({ name, onConfirm, onClose }: SignatureDialogProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const area = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - area.left) * event.currentTarget.width) / area.width,
      y: ((event.clientY - area.top) * event.currentTarget.height) / area.height,
    };
  };

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111111';
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = event.currentTarget.getContext('2d');
    const { x, y } = point(event);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setEmpty(false);
  }

  function clear() {
    const target = canvas.current;
    target?.getContext('2d')?.clearRect(0, 0, target.width, target.height);
    setEmpty(true);
  }

  function confirm() {
    canvas.current?.toBlob(async (blob) => {
      if (!blob) return;
      setSaving(true);
      await onConfirm(blob);
      setSaving(false);
    }, 'image/png');
  }

  return (
    <FormDialog title={t('collect_signature')} description={name} onClose={onClose}>
      <canvas
        ref={canvas}
        width={600}
        height={240}
        aria-label={t('signature_area')}
        className="h-48 w-full touch-none rounded-md border border-input bg-card"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => {
          drawing.current = false;
        }}
      />
      <ItemDescription>{t('sign_with_finger')}</ItemDescription>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={clear} disabled={empty || saving}>
          {t('clear')}
        </Button>
        <Button type="button" onClick={confirm} disabled={empty || saving}>
          {t('save_signature')}
        </Button>
      </div>
    </FormDialog>
  );
}
