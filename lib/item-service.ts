import type { Prisma } from "@prisma/client";

import { parseDateOnly } from "@/lib/dates";
import {
  itemPayloadSchema,
  itemPatchSchema,
  type ItemPayload,
  type ItemPatchPayload,
} from "@/lib/item-schema";

export type ItemApiInput = ItemPayload & {
  allowDuplicate?: boolean;
};

export function parseItemApiInput(raw: unknown): { data?: ItemApiInput; error?: string } {
  const parsed = itemPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => issue.message).join(", ") };
  }

  return {
    data: {
      ...parsed.data,
      allowDuplicate:
        typeof (raw as { allowDuplicate?: unknown }).allowDuplicate === "boolean"
          ? Boolean((raw as { allowDuplicate?: unknown }).allowDuplicate)
          : false,
    },
  };
}

export function parseItemPatchInput(raw: unknown): {
  data?: ItemPatchPayload;
  error?: string;
} {
  const parsed = itemPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => issue.message).join(", ") };
  }

  return { data: parsed.data };
}

function parseRequiredDate(dateInput: string): Date {
  const date = parseDateOnly(dateInput);
  if (!date) {
    throw new Error("Invalid date");
  }
  return date;
}

export function toItemDbInput(input: ItemPayload): Prisma.ItemUncheckedCreateInput {
  const receivedDate = parseRequiredDate(input.receivedDate);
  const soldDate = parseDateOnly(input.soldDate ?? undefined);
  const videoDone = input.videoDone ?? false;
  const videoDoneAt = videoDone
    ? parseDateOnly(input.videoDoneAt ?? undefined) ?? new Date()
    : null;

  return {
    asin: input.asin,
    title: input.title,
    acquisitionType: input.acquisitionType,
    dispositionType: input.dispositionType,
    receivedDate,
    receiptValueCents: input.receiptValueCents,
    currency: input.currency,
    soldDate,
    saleProceedsCents:
      input.dispositionType === "GAVE_AWAY"
        ? 0
        : input.dispositionType === "KEPT"
          ? null
          : input.saleProceedsCents,
    notes: input.notes,
    videoDone,
    videoDoneAt,
    videoSlaDays: input.videoSlaDays ?? 14,
    videoNotes: input.videoNotes,
  };
}

export function toItemDbPatchInput(input: ItemPatchPayload): Prisma.ItemUncheckedUpdateInput {
  const dbInput: Prisma.ItemUncheckedUpdateInput = {};

  if (input.asin !== undefined) {
    dbInput.asin = input.asin;
  }
  if (input.title !== undefined) {
    dbInput.title = input.title;
  }
  if (input.acquisitionType !== undefined) {
    dbInput.acquisitionType = input.acquisitionType;
  }
  if (input.dispositionType !== undefined) {
    dbInput.dispositionType = input.dispositionType;
    if (input.dispositionType === "KEPT") {
      dbInput.soldDate = null;
      dbInput.saleProceedsCents = null;
    }
    if (input.dispositionType === "GAVE_AWAY") {
      dbInput.saleProceedsCents = 0;
    }
  }
  if (input.receivedDate !== undefined) {
    dbInput.receivedDate = parseRequiredDate(input.receivedDate);
  }
  if (input.receiptValueCents !== undefined) {
    dbInput.receiptValueCents = input.receiptValueCents;
  }
  if (input.currency !== undefined) {
    dbInput.currency = input.currency;
  }
  if (input.soldDate !== undefined) {
    dbInput.soldDate = parseDateOnly(input.soldDate ?? undefined);
  }
  if (input.saleProceedsCents !== undefined) {
    dbInput.saleProceedsCents = input.saleProceedsCents;
  }
  if (input.notes !== undefined) {
    dbInput.notes = input.notes && input.notes.trim().length > 0 ? input.notes.trim() : null;
  }
  if (input.videoDone !== undefined) {
    dbInput.videoDone = input.videoDone;
    if (input.videoDone === false) {
      dbInput.videoDoneAt = null;
    }
  }
  if (input.videoDoneAt !== undefined) {
    dbInput.videoDoneAt = parseDateOnly(input.videoDoneAt ?? undefined);
  }
  if (input.videoSlaDays !== undefined) {
    dbInput.videoSlaDays = input.videoSlaDays;
  }
  if (input.videoNotes !== undefined) {
    dbInput.videoNotes =
      input.videoNotes && input.videoNotes.trim().length > 0
        ? input.videoNotes.trim()
        : null;
  }

  return dbInput;
}
