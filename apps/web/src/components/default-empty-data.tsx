import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { ReactNode } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';

// Estado vazio sem moldura: ilustração, título, descrição e no máximo uma
// ação. Cada tela passa `title`/`description`/`action` direto — sem `title` vira
// "não encontrado"; sem `description`, o convite a mudar a filtragem.
type DefaultEmptyDataProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 220 140" fill="none" aria-hidden="true" className="h-32 w-54 text-foreground">
      <g stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5}>
        <line x1="40" y1="0" x2="40" y2="140" />
        <line x1="110" y1="0" x2="110" y2="140" />
        <line x1="180" y1="0" x2="180" y2="140" />
        <line x1="0" y1="25" x2="220" y2="25" />
        <line x1="0" y1="70" x2="220" y2="70" />
        <line x1="0" y1="115" x2="220" y2="115" />
      </g>
      <polygon
        points="89,58 110,70 110,94 89,106 68,94 68,70"
        stroke="currentColor"
        strokeOpacity={0.28}
        strokeWidth={0.75}
        strokeLinejoin="round"
      />
      <g stroke="currentColor" strokeOpacity={0.18} strokeWidth={0.5}>
        <line x1="89" y1="82" x2="68" y2="70" />
        <line x1="89" y1="82" x2="110" y2="70" />
        <line x1="89" y1="82" x2="89" y2="106" />
      </g>
      <polygon
        points="110,46 131,58 131,82 110,94 89,82 89,58"
        stroke="currentColor"
        strokeOpacity={0.38}
        strokeWidth={0.75}
        strokeLinejoin="round"
      />
      <g stroke="currentColor" strokeOpacity={0.25} strokeWidth={0.5}>
        <line x1="110" y1="70" x2="89" y2="58" />
        <line x1="110" y1="70" x2="131" y2="58" />
        <line x1="110" y1="70" x2="110" y2="94" />
      </g>
      <polygon
        points="131,34 152,46 152,70 131,82 110,70 110,46"
        stroke="currentColor"
        strokeOpacity={0.5}
        strokeWidth={0.75}
        strokeLinejoin="round"
      />
      <g stroke="currentColor" strokeOpacity={0.35} strokeWidth={0.5}>
        <line x1="131" y1="58" x2="110" y2="46" />
        <line x1="131" y1="58" x2="152" y2="46" />
        <line x1="131" y1="58" x2="131" y2="82" />
      </g>
      <path
        d="M148 22 L155 26 L148 30 L141 26 Z"
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={0.5}
        strokeDasharray="2 2"
      />
      <circle cx="40" cy="70" r="1.5" fill="currentColor" opacity={0.1} />
      <circle cx="180" cy="70" r="1.5" fill="currentColor" opacity={0.1} />
      <circle cx="110" cy="25" r="1.5" fill="currentColor" opacity={0.07} />
    </svg>
  );
}

export function DefaultEmptyData({ title, description, action }: DefaultEmptyDataProps) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-7 py-8 text-center">
      <div className="flex max-w-md flex-col items-center gap-4">
        <EmptyIllustration />
        <div className="flex flex-col items-center gap-2">
          <ItemTitle className="text-lg tracking-tight">{title ?? t('not_found')}</ItemTitle>
          <ItemDescription className="line-clamp-none max-w-100 text-center">
            {description ?? t('change_filters_or_add_data')}
          </ItemDescription>
        </div>
      </div>
      {action && <div className="flex w-full flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
