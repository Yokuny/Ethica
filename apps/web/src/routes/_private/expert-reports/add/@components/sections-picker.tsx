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
                onCheckedChange={(checked) => onChange({ ...choices, [section.id]: checked ? 'yes' : undefined })}
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
