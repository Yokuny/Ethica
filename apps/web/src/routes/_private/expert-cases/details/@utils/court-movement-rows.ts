import {
  AUTOMATION_RULES,
  CASE_FINISHED_CODES,
  type CourtMovement,
  FEES_COLLECTION_CODES,
  isPaymentAvailable,
  isPaymentIntent,
} from '@ethica/contracts';

export type CourtMovementRow = {
  key: string;
  name: string;
  at: string;
  complements: string[];
  count: number;
  // A movement some rule reads (SGD-08): it brought, or may bring, a notice or a suggestion.
  rule: boolean;
};

const DEADLINE_ELAPSED = 1051;
const PUBLISHED = 92;
const MADE_AVAILABLE = 1061;
const RULE_CODES = new Set([
  ...AUTOMATION_RULES.flatMap((rule) => rule.codes),
  ...FEES_COLLECTION_CODES,
  ...CASE_FINISHED_CODES,
]);

// The court list without noise (SGD-08), newest first as it comes: no "Decurso de Prazo"; the "Disponibilização no
// Diário" that comes with a "Publicação" in the same minute is one line; the same document on the same day is one
// line with how many ("Alvará ×16").
export const courtMovementRows = (movements: CourtMovement[]): CourtMovementRow[] => {
  const published = new Set(
    movements.filter((movement) => movement.code === PUBLISHED).map((movement) => movement.at.slice(0, 16)),
  );
  const rows = new Map<string, CourtMovementRow>();
  for (const movement of movements) {
    if (movement.code === DEADLINE_ELAPSED) continue;
    if (movement.code === MADE_AVAILABLE && published.has(movement.at.slice(0, 16))) continue;
    const complements = movement.complements.flatMap((item) => (item.name ? [item.name] : []));
    const group = `${movement.at.slice(0, 10)}|${movement.code}|${complements.join('|')}`;
    const row = rows.get(group);
    if (row) {
      row.count += 1;
      continue;
    }
    rows.set(group, {
      key: movement.key,
      name: movement.name,
      at: movement.at,
      complements,
      count: 1,
      rule: RULE_CODES.has(movement.code) || isPaymentIntent(movement) || isPaymentAvailable(movement),
    });
  }
  return [...rows.values()];
};
