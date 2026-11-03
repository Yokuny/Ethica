import { numberSections, REPORT_LEVEL_MAX, sectionFamily } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { ArrowDown, ArrowUp, Ellipsis } from 'lucide-react';
import { Checkbox } from '@/components/checkbox.js';
import { NumberedList } from '@/components/numbered-list.js';
import { INSPECTION_VARIABLES } from '@/components/report-labels.js';
import type { PhotoEditor } from '@/components/rich-text-editor.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportRecord } from '@/query/report.js';
import { ReportSectionEditor } from './report-section-editor.js';

type ReportSectionsListProps = {
  report: ReportRecord;
  drafts: Record<string, string>;
  saving: boolean;
  onChange: (sectionId: string, html: string) => void;
  onSave: (sectionId: string) => void;
  onToggleIncluded: (sectionId: string, included: boolean) => void;
  onMove: (sectionId: string, direction: 'up' | 'down') => void;
  onRename: (sectionId: string) => void;
  onAdd: (sectionId: string, level: number) => void;
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
// "Faz parte do laudo" starts each row, at the left (AD-172); at the end, the arrows (the item moves with its
// subitems inside its topic, AD-171) and its "…" (title, new item or subitem, remove).
export function ReportSectionsList({
  report,
  drafts,
  saving,
  onChange,
  onSave,
  onToggleIncluded,
  onMove,
  onRename,
  onAdd,
  onRemove,
  photos,
  uploadPhoto,
}: ReportSectionsListProps) {
  const readOnly = report.status === 'completed';
  const { sections } = report;
  const numbers = numberSections(sections);
  // A sibling of the same level above or below, inside the same topic.
  const canMove = (index: number, direction: 'up' | 'down'): boolean => {
    const level = sections[index]?.level ?? 1;
    if (direction === 'down') {
      return sections[index + 1 + sectionFamily(sections, index).children.length]?.level === level;
    }
    return sections.slice(0, index).findLast((section) => section.level <= level)?.level === level;
  };

  return (
    <NumberedList
      actionsLabel={t('part_of_report_hint')}
      items={sections.map((section, i) => {
        const draft = drafts[section.id] ?? section.html;
        const pending = report.issues.find((issue) => issue.sectionId === section.id)?.variables ?? [];
        const empty = !section.titleOnly && !plain(section.html);
        const dirty = draft !== section.html;
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
          leading: (
            <Checkbox
              checked={section.included}
              disabled={readOnly || saving}
              aria-label={t('part_of_report')}
              title={t('part_of_report')}
              onCheckedChange={(checked) => onToggleIncluded(section.id, checked)}
            />
          ),
          actions: readOnly ? undefined : (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t('move_up')}
                disabled={saving || !canMove(i, 'up')}
                onClick={() => onMove(section.id, 'up')}
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t('move_down')}
                disabled={saving || !canMove(i, 'down')}
                onClick={() => onMove(section.id, 'down')}
              >
                <ArrowDown />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button size="icon-sm" variant="ghost" aria-label={t('more_actions')} disabled={saving} />}
                >
                  <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRename(section.id)}>{t('edit_title')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAdd(section.id, section.level)}>
                    {t('add_item_below')}
                  </DropdownMenuItem>
                  {section.level < REPORT_LEVEL_MAX && (
                    <DropdownMenuItem onClick={() => onAdd(section.id, section.level + 1)}>
                      {t('add_sub_item')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onRemove(section.id)}>
                    {t('remove_section')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ),
          children: section.titleOnly ? undefined : (
            <ReportSectionEditor
              reportId={report.id}
              section={section}
              draft={draft}
              readOnly={readOnly}
              pending={pending}
              dirty={dirty}
              saving={saving}
              onChange={(html) => onChange(section.id, html)}
              onSave={() => onSave(section.id)}
              photos={photos}
              uploadPhoto={uploadPhoto}
            />
          ),
        };
      })}
    />
  );
}
