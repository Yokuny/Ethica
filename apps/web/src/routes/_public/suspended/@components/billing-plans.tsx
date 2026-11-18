import { BILLING_PLAN_CENTS, type BillingPlan } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { InfoCard, InfoCardList } from '@/components/info-card.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PLAN_OPTIONS } from '../@consts/plans.js';

type BillingPlansProps = {
  trialAvailable: boolean;
  paying?: BillingPlan;
  onPay: (plan: BillingPlan) => void;
};

export function BillingPlans({ trialAvailable, paying, onPay }: BillingPlansProps) {
  const options = PLAN_OPTIONS.filter((option) => option.plan !== 'trial' || trialAvailable);
  return (
    <InfoCardList>
      {options.map((option) => (
        <InfoCard
          key={option.plan}
          title={formatMoney(BILLING_PLAN_CENTS[option.plan])}
          description={option.description}
          badge={<Badge variant="secondary">{option.name}</Badge>}
          actions={
            <Button disabled={Boolean(paying)} onClick={() => onPay(option.plan)}>
              {t('pay')}
            </Button>
          }
        />
      ))}
    </InfoCardList>
  );
}
