import { createFileRoute, Link } from '@tanstack/react-router';
import { BarChart3, FileText, ListChecks, Receipt, Wallet } from 'lucide-react';
import { HubIllustration } from '@/components/hub-illustration.js';
import { LinkCard, LinkCardList } from '@/components/link-card.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PageIntro } from '@/components/page-intro.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Module hub: intro + one card per destination.
export function FinanceIndexPage() {
  return (
    <Card asPage>
      <CardHeader title={t('finance')} />
      <CardContent className="max-w-4xl gap-8">
        <PageIntro
          title={t('finance')}
          description={t('fees_receivable_and_operating_expenses')}
          illustration={<HubIllustration icon={Wallet} />}
          heading={t('know_what_to_pay_and_receive')}
          text={t('finance_hub_text')}
          features={[
            { icon: Receipt, label: t('fees') },
            { icon: ListChecks, label: t('partial_payments') },
            { icon: BarChart3, label: t('cash_flow') },
          ]}
        />
        <LinkCardList>
          <LinkCard
            icon={FileText}
            title={t('entries')}
            meta={[t('receivable_and_expenses')]}
            render={<Link to="/finance/entries" />}
          />
          <LinkCard
            icon={BarChart3}
            title={t('reports')}
            meta={[t('cash_flow'), t('by_category')]}
            render={<Link to="/finance/reports" />}
          />
        </LinkCardList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/finance/')({
  component: FinanceIndexPage,
  staticData: { title: t('finance') },
});
