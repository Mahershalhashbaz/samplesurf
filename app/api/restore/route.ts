import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import {
  normalizeAsin,
  normalizeAcquisitionType,
  normalizeDispositionType,
} from "@/lib/normalization";
import { badRequest, jsonResponse } from "@/lib/http";

const restoreRowSchema = z.object({
  asin: z.string(),
  title: z.string(),
  acquisitionType: z.string(),
  dispositionType: z.string().optional().nullable(),
  receivedDate: z.string(),
  receiptValue: z.string(),
  currency: z.string().optional().nullable(),
  soldDate: z.string().optional().nullable(),
  saleProceeds: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const body = await request.json();

  if (!body || !Array.isArray(body.rows)) {
    return badRequest("Rows are required");
  }

  const normalizedRows = [] as Array<{
    asin: string;
    title: string;
    acquisitionType: "SAMPLE" | "PURCHASED";
    dispositionType: "KEPT" | "SOLD" | "GAVE_AWAY";
    receivedDate: Date;
    receiptValueCents: number;
    currency: string;
    soldDate: Date | null;
    saleProceedsCents: number | null;
    notes: string | null;
  }>;

  for (const [index, row] of body.rows.entries()) {
    const parsed = restoreRowSchema.safeParse(row);
    if (!parsed.success) {
      return badRequest(`Invalid row at index ${index + 1}`);
    }

    const asin = normalizeAsin(parsed.data.asin);
    if (!asin) {
      return badRequest(`Row ${index + 1}: ASIN is required`);
    }

    const acquisitionType = normalizeAcquisitionType(parsed.data.acquisitionType);
    if (!acquisitionType) {
      return badRequest(`Row ${index + 1}: acquisition type is invalid`);
    }

    const receivedDate = parseDateOnly(parsed.data.receivedDate);
    if (!receivedDate) {
      return badRequest(`Row ${index + 1}: receivedDate is invalid`);
    }

    const receiptValueCents = parseMoneyToCents(parsed.data.receiptValue);
    if (receiptValueCents === null || receiptValueCents < 0) {
      return badRequest(`Row ${index + 1}: receiptValue is invalid`);
    }

    const soldDate = parseDateOnly(parsed.data.soldDate ?? undefined);
    const saleProceedsCents = parsed.data.saleProceeds
      ? parseMoneyToCents(parsed.data.saleProceeds)
      : null;

    if (parsed.data.saleProceeds && (saleProceedsCents === null || saleProceedsCents < 0)) {
      return badRequest(`Row ${index + 1}: saleProceeds is invalid`);
    }

    const dispositionType =
      normalizeDispositionType(parsed.data.dispositionType) ||
      (soldDate
        ? saleProceedsCents === 0
          ? "GAVE_AWAY"
          : "SOLD"
        : "KEPT");

    normalizedRows.push({
      asin,
      title: parsed.data.title,
      acquisitionType,
      dispositionType,
      receivedDate,
      receiptValueCents,
      currency: parsed.data.currency || "USD",
      soldDate: dispositionType === "KEPT" ? null : soldDate,
      saleProceedsCents:
        dispositionType === "GAVE_AWAY"
          ? 0
          : dispositionType === "KEPT"
            ? null
            : saleProceedsCents,
      notes: parsed.data.notes || null,
    });
  }

  await db.$transaction(async (tx) => {
    await tx.item.deleteMany();
    for (const row of normalizedRows) {
      await tx.item.create({ data: row });
    }
  });

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/needs-attention");
  revalidatePath("/tax-year");

  return jsonResponse({ restoredCount: normalizedRows.length });
}
