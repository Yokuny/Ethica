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

// Adjusts only the text tokens in theme.css through data-text-size on html.
// The preference persists in localStorage without affecting the fixed light theme.
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
      // No storage (private mode / cleared site data): the in-memory state
      // still works for this session, it just does not persist.
    }
  };

  return { textSize, setTextSize };
}
