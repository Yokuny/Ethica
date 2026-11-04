import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Checkbox } from '@/components/checkbox.js';
import { sideLabel } from '@/components/party-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { FIELD_LABEL } from '../@consts/field-label.js';
import type { PdfFill } from '../@hooks/use-pdf-fill.js';
import { CHOICE_FIELDS, displayValue, fieldOptions, partyKey, uniqueParties } from '../@utils/pdf-choices.js';

const NONE = 'none';

// Step 2 (AD-183): for each field, which value found in the files goes to the form; the parties, one by one.
export function PdfValuesStep({ pdf }: { pdf: PdfFill }) {
  const parties = uniqueParties(pdf.pdfs);
  const fields = CHOICE_FIELDS.map((field) => ({ field, options: fieldOptions(pdf.pdfs, field) }));
  const missing = [
    ...fields.filter(({ options }) => !options.length).map(({ field }) => field),
    ...(parties.length ? [] : (['parties'] as const)),
  ];

  return (
    <div className="grid gap-4">
      <ItemDescription className="line-clamp-none">{t('choose_values_description')}</ItemDescription>
      {fields
        .filter(({ options }) => options.length)
        .map(({ field, options }) => {
          const items = [
            ...options.map((option) => ({
              value: String(option.index),
              label: `${displayValue(field, option.value)} · ${option.file}`,
            })),
            { value: NONE, label: t('do_not_fill') },
          ];
          const index = pdf.choices[field];
          return (
            <div key={field} className="grid gap-1">
              <ItemTitle>{t(FIELD_LABEL[field])}</ItemTitle>
              <Select
                items={items}
                value={index === undefined ? NONE : String(index)}
                onValueChange={(next) => pdf.choose(field, !next || next === NONE ? undefined : Number(next))}
              >
                <SelectTrigger className="w-full" aria-label={t(FIELD_LABEL[field])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      {parties.length > 0 && (
        <div className="grid gap-2">
          <ItemTitle>{t('parties')}</ItemTitle>
          {parties.map((party) => (
            <Checkbox
              key={partyKey(party)}
              checked={pdf.partyKeys.has(partyKey(party))}
              onCheckedChange={(checked) => pdf.toggleParty(partyKey(party), checked)}
              label={`${party.name} · ${sideLabel(party.side, pdf.draft.courtType)} · ${t(party.type)}`}
            />
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <ItemDescription className="line-clamp-none">
          {`${t('not_found_in_pdf')}: ${missing.map((field) => t(FIELD_LABEL[field])).join(', ')}`}
        </ItemDescription>
      )}
    </div>
  );
}
