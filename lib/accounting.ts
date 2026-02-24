import type { Item } from "@prisma/client";

import { isDispositionType } from "@/lib/types";

type GainLossInput = Pick<Item, "receiptValueCents" | "soldDate" | "saleProceedsCents" | "dispositionType">;

export function basisCents(item: Pick<Item, "receiptValueCents">): number {
  return item.receiptValueCents;
}

export function proceedsCents(item: Pick<Item, "saleProceedsCents" | "dispositionType">): number | null {
  if (!isDispositionType(item.dispositionType)) {
    return item.saleProceedsCents;
  }

  if (item.dispositionType === "GAVE_AWAY") {
    return 0;
  }

  return item.saleProceedsCents;
}

export function isDisposed(item: Pick<Item, "dispositionType">): boolean {
  return item.dispositionType === "SOLD" || item.dispositionType === "GAVE_AWAY";
}

export function gainLossCents(item: GainLossInput): number | null {
  if (!item.soldDate) {
    return null;
  }

  if (!isDisposed(item)) {
    return null;
  }

  const proceeds = proceedsCents(item);
  if (proceeds === null) {
    return null;
  }

  return proceeds - item.receiptValueCents;
}

export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, value) => acc + (value ?? 0), 0);
}

export function negativeLossAmount(values: Array<number | null | undefined>): number {
  const totalNegative = values.reduce<number>((acc, value) => {
    if (value === null || value === undefined || value >= 0) {
      return acc;
    }
    return acc + value;
  }, 0);
  return Math.abs(totalNegative);
}
