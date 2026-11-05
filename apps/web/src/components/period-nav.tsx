import { Button } from '@ethica/ui/components/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PeriodNavProps = {
  // Middle button: "Hoje" on the agenda, the day itself in the field; the click goes back to today.
  label: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
};

// Period navigation (previous, today, next) in one frame without inner dividers (AD-194): the
// buttons are ghost inside a single outlined box, the agenda and the field use the same.
export function PeriodNav({ label, previousLabel, nextLabel, onPrevious, onToday, onNext }: PeriodNavProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset brings form styles; same div+role="group" as ButtonGroup.
    <div role="group" className="inline-flex w-fit items-center rounded-md border border-input bg-card shadow-xs">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={previousLabel}
        title={previousLabel}
        onClick={onPrevious}
      >
        <ChevronLeft />
      </Button>
      <Button type="button" variant="ghost" onClick={onToday}>
        {label}
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label={nextLabel} title={nextLabel} onClick={onNext}>
        <ChevronRight />
      </Button>
    </div>
  );
}
