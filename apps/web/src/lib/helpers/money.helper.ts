const MONEY_SCALE = 100;

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Displays integer cents as BRL currency (presentation only). */
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return moneyFormatter.format(0);
  return moneyFormatter.format(cents / MONEY_SCALE);
}

/**
 * Displays an integer value in the smallest unit (cents, with `precision` decimals)
 * as the currency of the given `code` — the format of the field-engine `currency`
 * fields, which vary currency/precision per field.
 */
export function formatCurrency(minorUnits: number, code: string, precision: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(minorUnits / 10 ** precision);
}

/** Extracts only the digits of an input string. */
function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Converts user input (masked or digits) into integer cents.
 * Digits are read as cents (e.g. "9990" → 9990, "99,90" through the mask → 9990).
 */
export function parseMoneyInput(raw: string | number): number {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) throw new Error('Valor não pode ser negativo');
    return Math.trunc(raw);
  }

  const digits = digitsOnly(raw);
  if (!digits) return 0;
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents) || cents < 0) throw new Error('Erro no valor informado ou valor não pode ser negativo');
  return cents;
}

/**
 * BRL mask while typing: treats the input as cents (last 2 digits = decimals).
 */
export function maskMoneyInput(raw: string): string {
  const digits = digitsOnly(raw);
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents)) return '';
  return formatMoney(cents);
}

/** Converts cents for display in an input (masked string). */
export function centsToInputDisplay(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '';
  return formatMoney(Math.trunc(cents));
}
