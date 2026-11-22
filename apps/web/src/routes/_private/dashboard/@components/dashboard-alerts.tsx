import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ChevronRight, CircleAlert, TriangleAlert } from 'lucide-react';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

const TONE = {
  error: 'border-status-error-border bg-status-error text-status-error-foreground',
  warning: 'border-status-warning-border bg-status-warning text-status-warning-foreground',
} as const;

// Alerts by rule (AD-255), only when something needs action: overdue fees (critical) and a negative balance in the
// period (attention). Icon and text besides the color; each one leads to the list that explains it.
export function DashboardAlerts({ lateCents, balanceCents }: { lateCents?: number; balanceCents?: number }) {
  const alerts = [
    lateCents
      ? {
          key: 'late',
          tone: 'error' as const,
          Icon: CircleAlert,
          title: `${formatMoney(lateCents)} ${t('overdue_fees_alert')}`,
          action: t('see_entries'),
          search: { state: 'overdue' as const },
        }
      : undefined,
    balanceCents !== undefined && balanceCents < 0
      ? {
          key: 'balance',
          tone: 'warning' as const,
          Icon: TriangleAlert,
          title: t('negative_balance_alert'),
          action: t('see_entries'),
          search: {},
        }
      : undefined,
  ].filter((alert) => alert !== undefined);
  if (!alerts.length) return null;

  return (
    <ul className="flex flex-col gap-2" aria-label={t('alerts')}>
      {alerts.map(({ key, tone, Icon, title, action, search }) => (
        <li key={key}>
          <Link
            to="/finance"
            search={search}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/25',
              TONE[tone],
            )}
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            <ItemTitle className="flex-1 font-medium text-inherit">{title}</ItemTitle>
            <ItemDescription className="hidden text-inherit sm:block">{action}</ItemDescription>
            <ChevronRight aria-hidden className="size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
