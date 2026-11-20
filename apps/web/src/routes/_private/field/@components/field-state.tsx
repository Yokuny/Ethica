import { Button } from '@ethica/ui/components/button';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Loading and error of the range query, the same on the three logistics pages; otherwise the page content.
export function FieldState({ query, children }: { query: UseQueryResult<unknown>; children: ReactNode }) {
  if (query.isLoading) return <DefaultLoading />;
  if (query.isError)
    return (
      <DefaultEmptyData
        title={t('load_error')}
        action={<Button onClick={() => void query.refetch()}>{t('try_again')}</Button>}
      />
    );
  return children;
}
