const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) {
    return "-";
  }
  return moneyFormatter.format(cents / 100);
}

export function parseMoneyToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }
  const cleaned = input.replace(/[$,\s]/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

export function centsToDecimalString(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return "";
  }
  return (cents / 100).toFixed(2);
}
