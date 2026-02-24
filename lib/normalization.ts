import { type AcquisitionType, type DispositionType } from "@/lib/types";

export function normalizeAsin(asin: string): string {
  return asin.trim().toUpperCase();
}

export function normalizeAcquisitionType(raw: string | null | undefined): AcquisitionType | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();

  if (["sample", "samples", "gift", "free", "influencer sample"].includes(normalized)) {
    return "SAMPLE";
  }

  if (["purchased", "purchase", "bought", "buy", "paid"].includes(normalized)) {
    return "PURCHASED";
  }

  return null;
}

export function normalizeDispositionType(raw: string | null | undefined): DispositionType | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();

  if (["kept", "keep", "inventory", "unsold", "held"].includes(normalized)) {
    return "KEPT";
  }

  if (["sold", "sale", "resold", "disposed sold"].includes(normalized)) {
    return "SOLD";
  }

  if (["gave_away", "gave away", "gifted", "donated", "discarded"].includes(normalized)) {
    return "GAVE_AWAY";
  }

  return null;
}
