const DIRECT_ASIN_PATTERN = /^B0[A-Z0-9]{8}$/i;
const FNSKU_PATTERN = /^X00[A-Z0-9]+$/i;
const RESOLVABLE_CODE_PATTERN = /\b(?:B[0O][A-Z0-9]{8}|X00[A-Z0-9]+)\b/gi;

export type ScannableCodeKind = "asin" | "fnsku" | "unknown";

export function normalizeScannableCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function detectScannableCodeKind(raw: string): ScannableCodeKind {
  const normalized = normalizeScannableCode(raw);
  if (DIRECT_ASIN_PATTERN.test(normalized)) {
    return "asin";
  }
  if (FNSKU_PATTERN.test(normalized)) {
    return "fnsku";
  }
  return "unknown";
}

export function isDirectAsinCode(raw: string): boolean {
  return detectScannableCodeKind(raw) === "asin";
}

export function isFnskuCode(raw: string): boolean {
  return detectScannableCodeKind(raw) === "fnsku";
}

export function extractResolvableCodesFromOcrText(text: string): string[] {
  const matches = text.matchAll(RESOLVABLE_CODE_PATTERN);
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const match of matches) {
    let code = normalizeScannableCode(match[0] ?? "");
    if (code.startsWith("BO") && code.length === 10) {
      code = `B0${code.slice(2)}`;
    }

    if (!code || seen.has(code)) {
      continue;
    }

    seen.add(code);
    codes.push(code);
  }

  return codes;
}
