import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useRef, useState } from 'react';
import { FormDialog } from '@/components/form-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';

type AssinaturaDialogProps = { nome: string; onConfirm: (png: Blob) => Promise<void>; onClose: () => void };

// Assinatura desenhada na tela (CAM-06, AD-129): vira PNG e vai para a fila de mídias.
export function AssinaturaDialog({ nome, onConfirm, onClose }: AssinaturaDialogProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazia, setVazia] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const ponto = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const area = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - area.left) * event.currentTarget.width) / area.width,
      y: ((event.clientY - area.top) * event.currentTarget.height) / area.height,
    };
  };

  function comecar(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    desenhando.current = true;
    const { x, y } = ponto(event);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111111';
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = event.currentTarget.getContext('2d');
    const { x, y } = ponto(event);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setVazia(false);
  }

  function limpar() {
    const alvo = canvas.current;
    alvo?.getContext('2d')?.clearRect(0, 0, alvo.width, alvo.height);
    setVazia(true);
  }

  function confirmar() {
    canvas.current?.toBlob(async (blob) => {
      if (!blob) return;
      setSalvando(true);
      await onConfirm(blob);
      setSalvando(false);
    }, 'image/png');
  }

  return (
    <FormDialog title={t('collect_signature')} description={nome} onClose={onClose}>
      <canvas
        ref={canvas}
        width={600}
        height={240}
        aria-label={t('signature_area')}
        className="h-48 w-full touch-none rounded-md border border-input bg-card"
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={() => {
          desenhando.current = false;
        }}
      />
      <ItemDescription>{t('sign_with_finger')}</ItemDescription>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={limpar} disabled={vazia || salvando}>
          {t('clear')}
        </Button>
        <Button type="button" onClick={confirmar} disabled={vazia || salvando}>
          {t('save_signature')}
        </Button>
      </div>
    </FormDialog>
  );
}
