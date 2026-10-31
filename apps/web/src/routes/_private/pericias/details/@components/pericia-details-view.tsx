import { FileText, Scale, Users } from 'lucide-react';
import { justicaLabel, PERICIA_STATUS_VARIANT } from '@/components/pericia-labels.js';
import { ProductSpecs } from '@/components/product-specs.js';
import { RecordHeader, RecordHeading, RecordStat, RecordStats, RecordStatus } from '@/components/record.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiaRecord } from '@/query/pericia.js';

const day = (value?: string) => (value ? formatDate(new Date(`${value}T12:00:00`)) : '-');
const money = (value?: number) => (value ? formatMoney(value) : '-');

// Página de registro: cabeçalho com processo e etapa, faixa com prazos e
// honorários, e os grupos de leitura (juízo, partes, observações).
export function PericiaDetailsView({ pericia }: { pericia: PericiaRecord }) {
  const variant = PERICIA_STATUS_VARIANT[pericia.status];
  return (
    <div className="grid gap-6">
      <RecordHeader>
        <RecordHeading
          icon={<Scale />}
          label={t(pericia.papel)}
          title={pericia.numeroProcesso}
          description={pericia.objeto}
        />
        <RecordStatus variant={variant} label={t(pericia.status)} pulse={pericia.status !== 'completed'} />
      </RecordHeader>
      <RecordStats>
        <RecordStat label={t('appointment_date')} value={day(pericia.dataNomeacao)} />
        <RecordStat label={t('proposed_fees')} value={money(pericia.honorariosPropostosCents)} />
        <RecordStat label={t('fixed_fees')} value={money(pericia.honorariosFixadosCents)} />
      </RecordStats>
      <ProductSpecs
        groups={[
          {
            id: 'juizo',
            name: t('court'),
            icon: <Scale />,
            specs: [
              { label: t('court_type'), value: justicaLabel(pericia.justica) },
              { label: t('tribunal'), value: pericia.tribunal },
              { label: t('court_division'), value: pericia.vara || '-' },
              { label: t('judicial_district'), value: pericia.comarca || '-' },
            ],
          },
          {
            id: 'partes',
            name: t('parties'),
            icon: <Users />,
            specs: [
              { label: t('plaintiff'), value: pericia.autor || '-' },
              { label: t('defendant'), value: pericia.reu || '-' },
            ],
          },
          {
            id: 'observacoes',
            name: t('notes'),
            icon: <FileText />,
            specs: [{ label: t('notes'), value: pericia.observacoes || '-' }],
          },
        ]}
      />
    </div>
  );
}
