import type { SignatoryInput } from '@ethica/contracts';
import { idSchema, signatorySchema } from '@ethica/contracts';
import { z } from 'zod';

export type { SignatoryInput };
export { signatorySchema };

export const signatoryIdParamSchema = z.object({ id: idSchema }).strict();

// Technical responsible (NLA-02). Empty text = not filled; `logo` is the versioned path of the image.
export type SignatoryRecord = SignatoryInput & { id: string; logo?: string };

export type SignatoryLogo = { key: string; bytes: number };
