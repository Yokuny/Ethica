import { PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { t } from '@/lib/helpers/translate.helper.js';

export const PDF_MAX_SIZE_TEXT = `${t('max_file_size')}: ${PDF_IMPORT_MAX_BYTES / 1024 / 1024} MB`;
