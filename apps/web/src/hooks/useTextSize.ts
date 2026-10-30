import { useEffect, useState } from 'react';

export type TextSize = 'sm' | 'md' | 'lg';

const STORAGE_KEY = 'text-size';
const DEFAULT_SIZE: TextSize = 'md';

const isTextSize = (value: unknown): value is TextSize => value === 'sm' || value === 'md' || value === 'lg';

const readStoredSize = (): TextSize => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTextSize(stored) ? stored : DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
};

// Ajusta apenas os tokens de texto em theme.css por data-text-size no html.
// A preferência persiste no localStorage sem afetar o tema claro fixo.
export function useTextSize() {
  const [textSize, setTextSizeState] = useState<TextSize>(readStoredSize);

  useEffect(() => {
    const root = document.documentElement;
    if (textSize === DEFAULT_SIZE) root.removeAttribute('data-text-size');
    else root.dataset.textSize = textSize;
  }, [textSize]);

  const setTextSize = (next: TextSize) => {
    setTextSizeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem storage (private mode / cleared site data): o estado em memória
      // ainda funciona para esta sessão, só não persiste.
    }
  };

  return { textSize, setTextSize };
}
