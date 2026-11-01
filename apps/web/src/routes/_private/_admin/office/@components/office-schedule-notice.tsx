import { SCHEDULE_NOTICE_MARKERS } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { DefaultLoading } from '@/components/default-loading.js';
import { TextareaField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useScheduleNoticeForm } from '../@hooks/use-schedule-notice-form.js';
import { type ScheduleNotice, scheduleNoticeQuery } from '../@query/office.js';

function NoticeForm({ notice }: { notice: ScheduleNotice }) {
  const { form, onSubmit, isPending } = useScheduleNoticeForm(notice);
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <div className="grid w-full gap-4">
          <TextField
            control={form.control}
            name="subject"
            label={t('subject')}
            placeholder={t('notice_subject_placeholder')}
          />
          <TextareaField
            control={form.control}
            name="body"
            label={t('message')}
            placeholder={t('notice_body_placeholder')}
          />
          <ItemDescription className="line-clamp-none">
            {t('notice_markers_hint')} {SCHEDULE_NOTICE_MARKERS.join(' · ')}
          </ItemDescription>
        </div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}

// Template of the schedule notice e-mail to the parties (AD-131).
export function OfficeScheduleNotice() {
  const query = useQuery(scheduleNoticeQuery);
  if (!query.data) return <DefaultLoading />;
  return <NoticeForm notice={query.data} />;
}
