import { numberSections } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Checkbox } from '@/components/checkbox.js';
import { NumberedList } from '@/components/numbered-list.js';
import { INSPECTION_VARIABLES } from '@/components/report-labels.js';
import type { PhotoEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportRecord } from '@/query/report.js';
import { ReportSectionEditor, type SectionDraft } from './report-section-editor.js';

type ReportSectionsListProps = {
  report: ReportRecord;
  drafts: Record<string, SectionDraft>;
  saving: boolean;
  onChange: (sectionId: string, draft: SectionDraft) => void;
  onSave: (sectionId: string) => void;
  onToggleIncluded: (sectionId: string, included: boolean) => void;
  onAdd: (sectionId: string) => void;
  onRemove: (sectionId: string) => void;
  photos?: PhotoEditor[];
  uploadPhoto?: (photo: Blob) => Promise<string>;
};

// Text without tags, for the line beside the title of a closed item.
const plain = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// NLA-05: the whole report in one scroll, numbered by position (AD-126), one item opened at a time or all.
export function ReportSectionsList({
  report,
  drafts,
  saving,
  onChange,
  onSave,
  onToggleIncluded,
  onAdd,
  onRemove,
  photos,
  uploadPhoto,
}: ReportSectionsListProps) {
  const readOnly = report.status === 'completed';
  const numbers = numberSections(report.sections);

  return (
    <NumberedList
      items={report.sections.map((section, i) => {
        const draft = drafts[section.id] ?? { title: section.title, html: section.html };
        const pending = report.issues.find((issue) => issue.sectionId === section.id)?.variables ?? [];
        const empty = !section.titleOnly && !plain(section.html);
        const dirty = draft.title !== section.title || draft.html !== section.html;
        return {
          id: section.id,
          number: numbers[i],
          level: section.level,
          title: section.title,
          summary: plain(section.html),
          muted: !section.included,
          badge:
            section.included && (pending.length > 0 || empty) ? (
              <Badge variant="warning">
                {pending.some((variable) => INSPECTION_VARIABLES.includes(variable))
                  ? `${t('pending')} · ${t('inspection')}`
                  : t('pending')}
              </Badge>
            ) : dirty ? (
              <Badge variant="info">{t('not_saved')}</Badge>
            ) : undefined,
          actions: (
            <Checkbox
              checked={section.included}
              disabled={readOnly || saving}
              label={t('part_of_report')}
              labelClassName="hidden sm:inline"
              onCheckedChange={(checked) => onToggleIncluded(section.id, checked)}
            />
          ),
          children: (
            <ReportSectionEditor
              reportId={report.id}
              section={section}
              draft={draft}
              readOnly={readOnly}
              pending={pending}
              dirty={dirty}
              saving={saving}
              onChange={(next) => onChange(section.id, next)}
              onSave={() => onSave(section.id)}
              onAdd={() => onAdd(section.id)}
              onRemove={() => onRemove(section.id)}
              photos={photos}
              uploadPhoto={uploadPhoto}
            />
          ),
        };
      })}
    />
  );
}
