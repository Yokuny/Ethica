import { numberSections } from '@ethica/contracts';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { cn } from 'cn';
import { TriangleAlert } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { ReportRecord } from '@/query/report.js';

type ReportSectionsNavProps = { report: ReportRecord; selected: string; onSelect: (sectionId: string) => void };

// Seções numeradas pela posição (AD-126); a que tem variável sem valor fica marcada (LAU-03.3).
export function ReportSectionsNav({ report, selected, onSelect }: ReportSectionsNavProps) {
  const numbers = numberSections(report.sections);
  const pending = new Set(report.issues.map((issue) => issue.sectionId));

  return (
    <nav aria-label={t('sections')} className="flex flex-col gap-0.5">
      {report.sections.map((section, i) => (
        <button
          key={section.id}
          type="button"
          aria-current={section.id === selected ? 'true' : undefined}
          onClick={() => onSelect(section.id)}
          className={cn(
            'flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
            section.id === selected && 'bg-accent',
            section.level > 1 && 'pl-5',
            section.level > 2 && 'pl-8',
          )}
        >
          <ItemDescription className="w-8 shrink-0 tabular-nums">{numbers[i]}</ItemDescription>
          <ItemTitle className="min-w-0 flex-1 font-normal">{section.title}</ItemTitle>
          {pending.has(section.id) && (
            <TriangleAlert aria-label={t('missing_values')} className="size-4 shrink-0 text-status-warning-indicator" />
          )}
        </button>
      ))}
    </nav>
  );
}
