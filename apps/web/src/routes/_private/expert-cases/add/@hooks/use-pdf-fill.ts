import { PDF_IMPORT_MAX_BYTES } from '@ethica/contracts';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../../@interface/cases.interface.js';
import { importPdfMutation, type PdfExtraction } from '../../@query/import.js';
import { PDF_MAX_SIZE_TEXT } from '../@consts/pdf-max-size.js';
import {
  type ChoiceField,
  type Choices,
  chosenDraft,
  initialChoices,
  partyKey,
  type ReadPdf,
  uniqueParties,
} from '../@utils/pdf-choices.js';

export type PdfFile = {
  id: string;
  name: string;
  status: 'reading' | 'read' | 'error';
  extraction?: PdfExtraction;
  error?: string;
};

// AD-183: several PDFs fill the form in three steps (files → choose values → fill); the expert
// checks and saves (AD-115). The files are read one at a time, so the server is not flooded.
export function usePdfFill(form: UseFormReturn<CaseFormValues>) {
  const mutation = useMutation(importPdfMutation());
  const queue = useRef(Promise.resolve());
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [choices, setChoices] = useState<Choices>({});
  const [partyKeys, setPartyKeys] = useState<Set<string>>(new Set());
  const [filled, setFilled] = useState(false);

  const pdfs: ReadPdf[] = files.flatMap((file) =>
    file.extraction ? [{ name: file.name, draft: file.extraction.draft }] : [],
  );
  const update = (id: string, patch: Partial<PdfFile>) =>
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, ...patch } : file)));

  function addFiles(list: FileList | null) {
    for (const file of Array.from(list ?? [])) {
      const id = crypto.randomUUID();
      const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const error = !pdf
        ? t('unsupported_file_type')
        : file.size > PDF_IMPORT_MAX_BYTES
          ? `${t('file_too_large')} ${PDF_MAX_SIZE_TEXT}.`
          : undefined;
      setFiles((current) => [...current, { id, name: file.name, status: error ? 'error' : 'reading', error }]);
      if (error) continue;
      queue.current = queue.current.then(() =>
        mutation.mutateAsync(file).then(
          (extraction) => update(id, { status: 'read', extraction }),
          (failure: Error) => update(id, { status: 'error', error: failure.message }),
        ),
      );
    }
  }

  function start() {
    setFiles([]);
    setStep(0);
    setOpen(true);
  }

  function chooseValues() {
    setChoices(initialChoices(pdfs));
    setPartyKeys(new Set(uniqueParties(pdfs).map(partyKey)));
    setStep(1);
  }

  function choose(field: ChoiceField, index?: number) {
    setChoices((current) => ({ ...current, [field]: index }));
  }

  function toggleParty(key: string, checked: boolean) {
    setPartyKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  // The other fields keep what the expert already typed.
  function fill() {
    form.reset({ ...form.getValues(), ...chosenDraft(pdfs, choices, partyKeys) });
    setFilled(true);
    setOpen(false);
  }

  return {
    open,
    start,
    close: () => setOpen(false),
    step,
    setStep,
    files,
    addFiles,
    removeFile: (id: string) => setFiles((current) => current.filter((file) => file.id !== id)),
    reading: files.some((file) => file.status === 'reading'),
    pdfs,
    chooseValues,
    choices,
    choose,
    partyKeys,
    toggleParty,
    draft: chosenDraft(pdfs, choices, partyKeys),
    fill,
    filled,
  };
}

export type PdfFill = ReturnType<typeof usePdfFill>;
