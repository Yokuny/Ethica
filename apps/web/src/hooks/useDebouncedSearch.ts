import { useEffect, useRef, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

// Extracted from the old componentes/ui/data-table.tsx: keeps the input responsive
// (local state updates immediately) without firing `onChange` — and therefore the
// server-side navigation/refetch (AD-028) — on every keystroke.
export function useDebouncedSearch(value: string, onChange: (value: string) => void) {
  const [search, setSearch] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setSearch(value), [value]);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleChange = (next: string) => {
    setSearch(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), SEARCH_DEBOUNCE_MS);
  };

  return [search, handleChange] as const;
}
