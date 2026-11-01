import { PERICIA_PARADA_DIAS } from '@ethica/contracts';
import { Link } from '@tanstack/react-router';
import { Hourglass } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiasParadas } from '@/query/pericia.js';

// Bloco "Perícias paradas" (GES-05): as mais antigas sem movimentação e o caminho para o PDF.
export function PericiasParadasList({ paradas }: { paradas: PericiasParadas }) {
  return (
    <div className="grid gap-3">
      <LinkList>
        {paradas.items.map((pericia) => (
          <LinkListItem
            key={pericia.id}
            render={<Link to="/expert-cases/details" search={{ id: pericia.id }} />}
            icon={Hourglass}
            title={pericia.numeroProcesso}
            description={`${pericia.diasParada} ${t('days_without_movement')} · ${pericia.objeto}`}
          />
        ))}
      </LinkList>
      <AppLink to="/reports" as="description">
        {`${paradas.total} ${t('stalled_more_than')} ${PERICIA_PARADA_DIAS} ${t('days')} · ${t('stalled_report_pdf')}`}
      </AppLink>
    </div>
  );
}
