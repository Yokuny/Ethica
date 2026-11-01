import { type VistoriaDados, vistoriaDadosSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apagarRascunho, lerRascunho, type Rascunho, salvarRascunho } from '@/lib/offline/store.js';
import { atualizarPendencias, sincronizar } from '@/lib/offline/sync.js';
import { type VistoriaDoDia, type VistoriaRecord, vistoriaKeys } from '@/query/vistoria.js';

// Campo opcional vazio no formulário vira ausente, como o contrato espera.
const limpar = <T>(valor: T): T => {
  if (Array.isArray(valor)) return valor.map(limpar) as T;
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([, item]) => item !== '' && item !== undefined && !(typeof item === 'number' && Number.isNaN(item)))
        .map(([chave, item]) => [chave, limpar(item)]),
    ) as T;
  }
  return valor;
};

const ENVIO_APOS_MS = 1500;

// Registro da vistoria (CAM-02, CAM-05): cada mudança fica no aparelho na hora e é enviada
// pouco depois, se houver conexão; a versão de base vem do rascunho ou do servidor (AD-128).
export function useRegistro(item: VistoriaDoDia, rascunhoInicial?: Rascunho) {
  const queryClient = useQueryClient();
  const compromissoId = item.compromisso.id;
  const form = useForm<VistoriaDados>({
    resolver: zodResolver(vistoriaDadosSchema),
    defaultValues: rascunhoInicial?.dados ?? item.vistoria.dados,
  });
  const [conflito, setConflito] = useState<VistoriaRecord | undefined>(rascunhoInicial?.conflito);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ignorar = useRef(false);

  const serverVersion = () =>
    queryClient.getQueryData<VistoriaDoDia>(vistoriaKeys.detail(compromissoId))?.vistoria.versao ??
    item.vistoria.versao;

  async function enviar() {
    if (!(await form.trigger())) return;
    await sincronizar(queryClient);
    setConflito((await lerRascunho(compromissoId))?.conflito);
  }

  useEffect(() => {
    const assinatura = form.watch((valores) => {
      if (ignorar.current) return;
      void (async () => {
        const existente = await lerRascunho(compromissoId);
        await salvarRascunho({
          compromissoId,
          versao: existente?.versao ?? serverVersion(),
          dados: limpar(valores) as VistoriaDados,
          alteradoEm: new Date().toISOString(),
          ...(existente?.conflito ? { conflito: existente.conflito } : {}),
        });
        await atualizarPendencias();
      })();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void enviar(), ENVIO_APOS_MS);
    });
    return () => {
      assinatura.unsubscribe();
      clearTimeout(timer.current);
    };
  });

  // Conflito: manter a versão do aparelho (grava sobre a do servidor) ou usar a do servidor.
  async function keepMine() {
    const rascunho = await lerRascunho(compromissoId);
    if (!rascunho || !conflito) return;
    await salvarRascunho({ ...rascunho, versao: conflito.versao, conflito: undefined });
    setConflito(undefined);
    await enviar();
  }

  async function keepServer() {
    if (!conflito) return;
    await apagarRascunho(compromissoId);
    ignorar.current = true;
    form.reset(conflito.dados);
    ignorar.current = false;
    setConflito(undefined);
    await atualizarPendencias();
    await queryClient.invalidateQueries({ queryKey: vistoriaKeys.detail(compromissoId) });
  }

  return { form, conflito, enviar, keepMine, keepServer };
}
