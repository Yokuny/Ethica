import { Button } from '@ethica/ui/components/button';
import { ButtonGroup } from '@ethica/ui/components/button-group';
import { ItemTitle } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COMPROMISSO_TIPO_ITEMS } from '@/components/compromisso-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { ALL_FILTER_VALUE, CALENDAR_VIEWS } from '../@consts/calendar.js';
import type { useAgendaPage } from '../@hooks/use-agenda-page.js';

const monthTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function CalendarToolbar({ state }: { state: ReturnType<typeof useAgendaPage> }) {
  const { view, date, search, setPanel, handleViewChange, handlePrevious, handleNext, handleToday, handleTipoChange } =
    state;
  const tipoItems = [{ value: ALL_FILTER_VALUE, label: t('all_types') }, ...COMPROMISSO_TIPO_ITEMS];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        aria-label={t('view')}
        value={view}
        onValueChange={(value) => handleViewChange(value as typeof view)}
      >
        {CALENDAR_VIEWS.map((viewOption) => (
          <ToggleGroupItem key={viewOption} value={viewOption}>
            {t(viewOption)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ButtonGroup>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('previous')}
          title={t('previous')}
          onClick={handlePrevious}
        >
          <ChevronLeft />
        </Button>
        <Button type="button" variant="outline" onClick={handleToday}>
          {t('today')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('next')}
          title={t('next')}
          onClick={handleNext}
        >
          <ChevronRight />
        </Button>
      </ButtonGroup>
      <ItemTitle className="first-letter:uppercase">{monthTitle.format(new Date(`${date}T12:00:00Z`))}</ItemTitle>
      <Select items={tipoItems} value={search.tipo ?? ALL_FILTER_VALUE} onValueChange={handleTipoChange}>
        <SelectTrigger size="compact">
          <SelectValue placeholder={t('type')} />
        </SelectTrigger>
        <SelectContent>
          {tipoItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto">
        <Button type="button" onClick={() => setPanel({ kind: 'create', date })}>
          {t('new_commitment')}
        </Button>
      </div>
    </div>
  );
}
