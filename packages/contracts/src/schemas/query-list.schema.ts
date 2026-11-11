import { z } from 'zod';

// Multi-value list filter (FIL-03): the key repeats in the URL (`phase=a&phase=b`) and Express 5 hands over a
// string or an array; both become a non-empty array.
export const queryListSchema = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : [value].flat()),
    z.array(item).min(1).optional(),
  );
