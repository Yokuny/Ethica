import { COMPROMISSO_STATUS, COMPROMISSO_TIPOS, type CompromissoTipo } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

export const COMPROMISSO_TIPO_VARIANT: Record<CompromissoTipo, IndicatorVariant> = {
  inspection: 'violet',
  hearing: 'info',
  meeting: 'cyan',
  other: 'neutral',
};

export const COMPROMISSO_TIPO_ITEMS = COMPROMISSO_TIPOS.map((value) => ({ value, label: t(value) }));
export const COMPROMISSO_STATUS_ITEMS = COMPROMISSO_STATUS.map((value) => ({ value, label: t(value) }));
