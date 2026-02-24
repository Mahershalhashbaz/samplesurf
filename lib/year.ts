export const TAX_YEAR_STORAGE_KEY = "sample-ledger.taxYear";

export function currentTaxYear(): number {
  return new Date().getUTCFullYear();
}

export function parseTaxYear(raw: string | null | undefined, fallback = currentTaxYear()): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 1900 || parsed > 9999) {
    return fallback;
  }
  return parsed;
}
