import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { createOportunidadeMutation, type DatajudResultado, searchDatajudMutation } from '../../@query/oportunidade.js';
import {
  type BuscaForm,
  type BuscaQuery,
  buscaFormSchema,
  DEFAULT_BUSCA,
  PAGE_SIZE,
} from '../@interface/busca.interface.js';

// Busca paginada por cursor (`search_after`): "Carregar mais" acrescenta à lista.
export function useBuscaDatajud() {
  const queryClient = useQueryClient();
  const form = useForm<BuscaForm>({ resolver: zodResolver(buscaFormSchema), defaultValues: DEFAULT_BUSCA });
  const search = useMutation(searchDatajudMutation());
  const save = useMutation(createOportunidadeMutation(queryClient));
  const [query, setQuery] = useState<BuscaQuery | null>(null);
  const [items, setItems] = useState<DatajudResultado[]>([]);
  const [cursor, setCursor] = useState<(string | number)[] | undefined>();

  function run(next: BuscaQuery, after?: (string | number)[]) {
    search.mutate(
      { ...next, size: PAGE_SIZE, cursor: after },
      {
        onSuccess: (result) => {
          setItems((prev) => (after ? [...prev, ...result.items] : result.items));
          setCursor(result.cursor);
        },
      },
    );
  }

  function onSubmit(data: BuscaForm) {
    const next = {
      tribunal: data.tribunal,
      assuntosTecnicos: data.tribunal.startsWith('trt') ? data.assuntosTecnicos : undefined,
      termo: data.termo || undefined,
      orgaoJulgador: data.orgaoJulgador || undefined,
      numeroProcesso: data.numeroProcesso || undefined,
      classeCodigo: data.classeCodigo,
      orgaoJulgadorCodigo: data.orgaoJulgadorCodigo,
    };
    setQuery(next);
    run(next);
  }

  function loadMore() {
    if (query && cursor) run(query, cursor);
  }

  function saveItem(item: DatajudResultado) {
    const data = {
      numeroProcesso: item.numeroProcesso,
      tribunal: item.tribunal,
      classe: item.classe,
      assuntos: item.assuntos,
      orgaoJulgador: item.orgaoJulgador,
      dataAjuizamento: item.dataAjuizamento,
      ultimoMovimento: item.ultimoMovimento,
      ultimoMovimentoEm: item.ultimoMovimentoEm,
    };
    save.mutate(data, {
      onSuccess: (created) => {
        setItems((prev) =>
          prev.map((row) =>
            row.numeroProcesso === item.numeroProcesso ? { ...row, oportunidadeId: created.id } : row,
          ),
        );
        toast.success(t('opportunity_saved'));
      },
      onError: (error: Error) => toast.error(error.message),
    });
  }

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    searched: query !== null,
    items,
    hasMore: Boolean(cursor),
    loadMore,
    isSearching: search.isPending,
    searchError: search.error?.message,
    saveItem,
    isSaving: save.isPending,
  };
}
