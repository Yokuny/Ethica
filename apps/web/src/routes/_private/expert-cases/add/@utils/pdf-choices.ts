import { type CasePartyInput, type CreateCase, partyNameKey } from '@ethica/contracts';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';

// AD-183: each PDF is read alone; where the files bring different values, the expert picks one per field.
export type ReadPdf = { name: string; draft: Partial<CreateCase> };

export const CHOICE_FIELDS = ['processNumber', 'court', 'division', 'district', 'subject', 'nominationDate'] as const;
export type ChoiceField = (typeof CHOICE_FIELDS)[number];
// Index of the file whose value fills the field; missing = the field is not filled.
export type Choices = Partial<Record<ChoiceField, number>>;
// The nomination is a date; the rest shows as read.
export const displayValue = (field: ChoiceField, value: string): string =>
  field === 'nominationDate' ? formatDate(value) : value;

export type FieldOption = { index: number; value: string; file: string };

// The different values of the field, each from the first file that brought it.
export const fieldOptions = (pdfs: ReadPdf[], field: ChoiceField): FieldOption[] => {
  const options: FieldOption[] = [];
  pdfs.forEach(({ name, draft }, index) => {
    const value = draft[field];
    if (typeof value === 'string' && value && !options.some((option) => option.value === value)) {
      options.push({ index, value, file: name });
    }
  });
  return options;
};

export const partyKey = (party: CasePartyInput): string => `${party.side}|${party.type}|${partyNameKey(party.name)}`;

// The parties of all the files, without repeating the same side, type and name (PSV-05).
export const uniqueParties = (pdfs: ReadPdf[]): CasePartyInput[] => {
  const parties = new Map<string, CasePartyInput>();
  for (const party of pdfs.flatMap(({ draft }) => draft.parties ?? [])) {
    if (!parties.has(partyKey(party))) parties.set(partyKey(party), party);
  }
  return [...parties.values()];
};

export const initialChoices = (pdfs: ReadPdf[]): Choices =>
  Object.fromEntries(
    CHOICE_FIELDS.flatMap((field) => {
      const first = fieldOptions(pdfs, field)[0];
      return first ? [[field, first.index]] : [];
    }),
  );

// The draft that goes to the form: the chosen values (the court brings the court type of the same file)
// and the marked parties.
export const chosenDraft = (pdfs: ReadPdf[], choices: Choices, partyKeys: Set<string>): Partial<CreateCase> => {
  const draft: Partial<CreateCase> = {};
  const role = pdfs.find(({ draft }) => draft.role)?.draft.role;
  if (role) draft.role = role;
  for (const field of CHOICE_FIELDS) {
    const source = pdfs[choices[field] ?? -1]?.draft;
    if (!source?.[field]) continue;
    Object.assign(draft, { [field]: source[field] });
    if (field === 'court' && source.courtType) draft.courtType = source.courtType;
  }
  const parties = uniqueParties(pdfs).filter((party) => partyKeys.has(partyKey(party)));
  if (parties.length) draft.parties = parties;
  return draft;
};
