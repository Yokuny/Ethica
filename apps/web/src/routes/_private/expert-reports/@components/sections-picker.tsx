import type { ReportVariant } from '@ethica/contracts';
import { numberSections } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { cn } from 'cn';
import { Checkbox } from '@/components/checkbox.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TemplateSectionRecord } from '@/query/report.js';

export type Choices = Record<string, ReportVariant | undefined>;

type SectionsPickerProps = {
  sections: TemplateSectionRecord[];
  choices: Choices;
  onChange: (choices: Choices) => void;
};

// "What should be included" (LAU-02.1): check the sections and pick the "yes" or "no" text.
export function SectionsPicker({ sections, choices, onChange }: SectionsPickerProps) {
  const numbers = numberSections(sections);
  const checked = sections.filter((section) => choices[section.id]).length;
  // Checking a subsection also checks the sections above it, so it is not numbered under the wrong one.
  const parentsOf = (index: number): string[] => {
    const ids: string[] = [];
    let level = sections[index]?.level ?? 1;
    for (let i = index - 1; i >= 0 && level > 1; i--) {
      const section = sections[i] as TemplateSectionRecord;
      if (section.level < level) {
        ids.push(section.id);
        level = section.level;
      }
    }
    return ids;
  };

  return (
    <Panel
      title={t('what_the_report_contains')}
      description={`${checked} ${t('of')} ${sections.length} ${t('sections').toLowerCase()}`}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() =>
              onChange(Object.fromEntries(sections.map((section) => [section.id, choices[section.id] ?? 'yes'])))
            }
          >
            {t('select_all')}
          </Button>
          <Button variant="outline" onClick={() => onChange({})}>
            {t('clear_selection')}
          </Button>
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {sections.map((section, i) => {
          const variant = choices[section.id];
          return (
            <li
              key={section.id}
              className={cn(
                'flex flex-wrap items-center gap-3 py-2',
                section.level > 1 && 'pl-6',
                section.level > 2 && 'pl-12',
              )}
            >
              <Checkbox
                checked={Boolean(variant)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? {
                          ...Object.fromEntries(parentsOf(i).map((id) => [id, choices[id] ?? 'yes'])),
                          ...choices,
                          [section.id]: 'yes',
                        }
                      : { ...choices, [section.id]: undefined },
                  )
                }
                aria-label={section.title}
                labelClassName="normal-case tracking-normal"
                label={
                  <span className="flex flex-col">
                    <ItemTitle>
                      {numbers[i]}. {section.title}
                    </ItemTitle>
                    {section.titleOnly && <ItemDescription>{t('title_only')}</ItemDescription>}
                  </span>
                }
              />
              {variant && !section.titleOnly && (
                <ToggleGroup
                  value={variant}
                  onValueChange={(value) => onChange({ ...choices, [section.id]: value as ReportVariant })}
                  className="ml-auto"
                >
                  <ToggleGroupItem value="yes" tone="success">
                    {t('yes')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="no" tone="neutral">
                    {t('no')}
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
