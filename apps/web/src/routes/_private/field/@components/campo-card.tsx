import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { ClipboardList, MapPin } from 'lucide-react';
import { COMPROMISSO_TIPO_VARIANT } from '@/components/compromisso-labels.js';
import { formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { VistoriaDoDia } from '@/query/vistoria.js';

type CampoCardProps = {
  item: VistoriaDoDia;
  onStatus: (status: 'done' | 'canceled', motivo?: 'postponed' | 'absent') => void;
};

const mapsUrl = (local: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(local)}`;
const wazeUrl = (local: string) => `https://waze.com/ul?q=${encodeURIComponent(local)}&navigate=yes`;

// Um compromisso do dia no celular (CAM-01): chegar, marcar o resultado e abrir o registro.
export function CampoCard({ item, onStatus }: CampoCardProps) {
  const { compromisso, legalCase, vistoria } = item;
  const status = compromisso.motivo ?? compromisso.status;
  const registrado = vistoria.versao > 0 || vistoria.midias.length > 0;

  return (
    <Item render={<li />} className="gap-3">
      <div className="flex basis-full items-start gap-3">
        <ItemContent>
          <div className="flex flex-wrap items-center gap-2">
            <ItemTitle className="tabular-nums">{formatDisplayTime(compromisso.inicio)}</ItemTitle>
            <Badge variant={COMPROMISSO_TIPO_VARIANT[compromisso.tipo]}>{t(compromisso.tipo)}</Badge>
            <Badge variant="secondary">{t(status)}</Badge>
            {registrado && <Badge variant="success">{t('record_started')}</Badge>}
          </div>
          <ItemTitle>{compromisso.titulo}</ItemTitle>
          {legalCase && (
            <ItemDescription className="line-clamp-none">
              {[legalCase.processNumber, [legalCase.plaintiff, legalCase.defendant].filter(Boolean).join(' × ')]
                .filter(Boolean)
                .join(' · ')}
            </ItemDescription>
          )}
          {compromisso.local && (
            <ItemDescription className="line-clamp-none">
              <MapPin className="mr-1 inline size-3.5" aria-hidden />
              {compromisso.local}
            </ItemDescription>
          )}
        </ItemContent>
      </div>
      <ItemFooter className="flex-wrap gap-2">
        <ItemActions className="flex-wrap">
          {compromisso.local && (
            <>
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href={mapsUrl(compromisso.local)} target="_blank" rel="noreferrer">
                    Google Maps
                  </a>
                }
              />
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href={wazeUrl(compromisso.local)} target="_blank" rel="noreferrer">
                    Waze
                  </a>
                }
              />
            </>
          )}
        </ItemActions>
        <ItemActions className="ml-auto flex-wrap">
          <Button variant="outline" onClick={() => onStatus('done')} disabled={compromisso.status === 'done'}>
            {t('done')}
          </Button>
          <Button variant="outline" onClick={() => onStatus('canceled', 'postponed')}>
            {t('postponed')}
          </Button>
          <Button variant="outline" onClick={() => onStatus('canceled', 'absent')}>
            {t('absent')}
          </Button>
          <Button nativeButton={false} render={<Link to="/field/inspection" search={{ id: compromisso.id }} />}>
            <ClipboardList />
            {t('inspection_record')}
          </Button>
        </ItemActions>
      </ItemFooter>
    </Item>
  );
}
