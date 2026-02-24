import type { Item } from "@prisma/client";

import { isAcquisitionType, isDispositionType } from "@/lib/types";

export type AttentionItem = {
  id: string;
  title: string;
  acquisitionType: string | null;
  dispositionType: string | null;
  receivedDate: Date | null;
  receiptValueCents: number | null;
  soldDate: Date | null;
  saleProceedsCents: number | null;
};

export function getNeedsAttentionReasons(item: AttentionItem): string[] {
  const reasons: string[] = [];

  if (!item.title || !item.title.trim()) {
    reasons.push("Missing title");
  }

  if (!isAcquisitionType(item.acquisitionType)) {
    reasons.push("Missing or invalid acquisition type");
  }

  if (!isDispositionType(item.dispositionType)) {
    reasons.push("Missing or invalid disposition type");
  }

  if (!item.receivedDate) {
    reasons.push("Missing received date");
  }

  if (item.receiptValueCents === null || item.receiptValueCents < 0) {
    reasons.push("Invalid receipt value");
  }

  if (item.saleProceedsCents !== null && item.saleProceedsCents < 0) {
    reasons.push("Invalid sale proceeds");
  }

  if (item.soldDate && item.receivedDate && item.soldDate < item.receivedDate) {
    reasons.push("Disposed date is before received date");
  }

  if (item.dispositionType === "SOLD") {
    if (!item.soldDate) {
      reasons.push("SOLD item is missing disposed date");
    }
    if (item.saleProceedsCents === null) {
      reasons.push("SOLD item is missing sale proceeds");
    }
  }

  if (item.dispositionType === "GAVE_AWAY") {
    if (!item.soldDate) {
      reasons.push("GAVE_AWAY item is missing disposed date");
    }
    if (item.saleProceedsCents !== 0) {
      reasons.push("GAVE_AWAY proceeds must be 0");
    }
  }

  if (item.dispositionType === "KEPT") {
    if (item.soldDate) {
      reasons.push("KEPT item should not have disposed date");
    }
    if (item.saleProceedsCents !== null) {
      reasons.push("KEPT item should not have sale proceeds");
    }
  }

  return reasons;
}

export function needsAttention(item: AttentionItem | Item): boolean {
  return getNeedsAttentionReasons(item as AttentionItem).length > 0;
}
