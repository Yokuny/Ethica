import { Badge, BadgeIndicator } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppLink } from '@/components/app-link.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { TablePagination } from '@/components/table-pagination.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { markNoticeReadMutation, type NoticeRecord, noticesQuery } from '@/query/notification.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

const FINANCE_DUE_KEY: Record<string, string> = {
  overdue: 'finance_due_overdue',
  due_today: 'finance_due_today',
  due_soon: 'finance_due_soon',
};

// The database keeps the topic and its parameters; the sentence is built here, in pt-BR (AD-263).
const noticeText = (notice: NoticeRecord): { title: string; description: string } => {
  const params = notice.params ?? {};
  if (notice.topic === 'finance_due') {
    return {
      title: t(FINANCE_DUE_KEY[String(params.bucket)] ?? 'notices'),
      description: `${params.description} · ${formatMoney(Number(params.openCents))} · ${day(String(params.dueDate))}`,
    };
  }
  if (notice.topic === 'automation_expiring') {
    return {
      title: t('automation_expiring_notice'),
      description: formatDate(new Date(String(params.automationUntil))),
    };
  }
  return { title: t('notices'), description: '' };
};

// "Avisos" tab of the Central (CNT-04): newest first, read per person, "Marcar todos como lidos".
export function NoticesList({
  page,
  limit,
  onPage,
}: {
  page: number;
  limit: number;
  onPage: (page: number, limit: number) => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery(noticesQuery(page, limit));
  const mutation = useMutation(markNoticeReadMutation(queryClient));
  const onError = (error: Error) => toast.error(error.message);

  if (query.isLoading) return <DefaultLoading />;
  const items = query.data?.items ?? [];
  if (!items.length) return <DefaultEmptyData title={t('no_notices')} />;

  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
        <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({}, { onError })}>
          {t('mark_all_as_read')}
        </Button>
      </div>
      {items.map((notice) => {
        const text = noticeText(notice);
        return (
          <Item key={notice.id} variant="muted" className={notice.read ? 'opacity-70' : undefined}>
            <ItemContent>
              <ItemTitle className="gap-2">
                {!notice.read && <BadgeIndicator variant={notice.severity === 'warning' ? 'warning' : 'info'} />}
                {text.title}
              </ItemTitle>
              <ItemDescription className="line-clamp-none">{text.description}</ItemDescription>
              {notice.caseId && (
                <AppLink to="/finance" search={{ caseId: notice.caseId }} as="description">
                  {t('finance')}
                </AppLink>
              )}
            </ItemContent>
            <ItemActions>
              {notice.read ? (
                <Badge variant="secondary">{t('read')}</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: notice.id }, { onError })}
                >
                  {t('mark_as_read')}
                </Button>
              )}
            </ItemActions>
          </Item>
        );
      })}
      <TablePagination
        pageIndex={page - 1}
        pageSize={limit}
        pageCount={Math.max(1, Math.ceil((query.data?.total ?? 0) / limit))}
        onPaginationChange={({ pageIndex, pageSize }) => onPage(pageIndex + 1, pageSize)}
      />
    </div>
  );
}
