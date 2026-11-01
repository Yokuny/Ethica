import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { createOpportunityMutation, type DatajudResult, searchDatajudMutation } from '../../@query/opportunity.js';
import {
  DEFAULT_SEARCH,
  PAGE_SIZE,
  type SearchForm,
  type SearchQuery,
  searchFormSchema,
} from '../@interface/search.interface.js';

// Busca paginada por cursor (`search_after`): "Carregar mais" acrescenta à lista.
export function useSearchDatajud() {
  const queryClient = useQueryClient();
  const form = useForm<SearchForm>({ resolver: zodResolver(searchFormSchema), defaultValues: DEFAULT_SEARCH });
  const search = useMutation(searchDatajudMutation());
  const save = useMutation(createOpportunityMutation(queryClient));
  const [query, setQuery] = useState<SearchQuery | null>(null);
  const [items, setItems] = useState<DatajudResult[]>([]);
  const [cursor, setCursor] = useState<(string | number)[] | undefined>();

  function run(next: SearchQuery, after?: (string | number)[]) {
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

  function onSubmit(data: SearchForm) {
    const next = {
      court: data.court,
      technicalSubjects: data.court.startsWith('trt') ? data.technicalSubjects : undefined,
      term: data.term || undefined,
      courtUnit: data.courtUnit || undefined,
      processNumber: data.processNumber || undefined,
      caseClassCode: data.caseClassCode,
      courtUnitCode: data.courtUnitCode,
    };
    setQuery(next);
    run(next);
  }

  function loadMore() {
    if (query && cursor) run(query, cursor);
  }

  function saveItem(item: DatajudResult) {
    const data = {
      processNumber: item.processNumber,
      court: item.court,
      caseClass: item.caseClass,
      subjects: item.subjects,
      courtUnit: item.courtUnit,
      filingDate: item.filingDate,
      lastMovement: item.lastMovement,
      lastMovementAt: item.lastMovementAt,
    };
    save.mutate(data, {
      onSuccess: (created) => {
        setItems((prev) =>
          prev.map((row) => (row.processNumber === item.processNumber ? { ...row, opportunityId: created.id } : row)),
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
