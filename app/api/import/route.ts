import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { badRequest, jsonResponse } from "@/lib/http";
import { normalizeAsin, normalizeDispositionType } from "@/lib/normalization";

const importRowSchema = z.object({
  rowNumber: z.number().int().min(1).optional(),
  asin: z.string().min(1),
  title: z.string(),
  acquisitionType: z.enum(["SAMPLE", "PURCHASED"]),
  dispositionType: z.enum(["KEPT", "SOLD", "GAVE_AWAY"]).optional(),
  receivedDate: z.string().min(1),
  receiptValueCents: z.number().int().min(0),
  soldDate: z.string().nullable().optional(),
  saleProceedsCents: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.string().optional().default("USD"),
  warningReasons: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();

  if (!body || !Array.isArray(body.rows)) {
    return badRequest("Rows are required");
  }

  const normalizedRows = [] as Array<{
    rowNumber: number;
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
    videoDone: boolean;
    videoDoneAt: Date | null;
    videoSlaDays: number;
    videoNotes: string | null;
  }>;

  const allowDuplicates = body.allowDuplicates === true;

  for (const [index, row] of body.rows.entries()) {
    const parsed = importRowSchema.safeParse(row);
    if (!parsed.success) {
      return badRequest(`Row ${index + 1} is invalid`);
    }

    const receivedDate = parseDateOnly(parsed.data.receivedDate);
    if (!receivedDate) {
      return badRequest(`Row ${index + 1} has invalid receivedDate`);
    }

    const soldDate = parseDateOnly(parsed.data.soldDate ?? undefined);
    const dispositionType =
      normalizeDispositionType(parsed.data.dispositionType) ||
      (soldDate
        ? parsed.data.saleProceedsCents === 0
          ? "GAVE_AWAY"
          : "SOLD"
        : "KEPT");

    normalizedRows.push({
      rowNumber: parsed.data.rowNumber ?? index + 2,
      asin: normalizeAsin(parsed.data.asin),
      title: parsed.data.title,
      acquisitionType: parsed.data.acquisitionType,
      dispositionType,
      receivedDate,
      receiptValueCents: parsed.data.receiptValueCents,
      currency: parsed.data.currency || "USD",
      soldDate: dispositionType === "KEPT" ? null : soldDate,
      saleProceedsCents:
        dispositionType === "GAVE_AWAY"
          ? 0
          : dispositionType === "KEPT"
            ? null
            : parsed.data.saleProceedsCents ?? null,
      notes: parsed.data.notes ?? null,
      videoDone: true,
      videoDoneAt: receivedDate,
      videoSlaDays: 14,
      videoNotes: null,
    });
  }

  const rejectedRows: Array<{ rowNumber: number; asin: string; reason: string }> = [];
  let rowsToCreate = normalizedRows;

  if (!allowDuplicates) {
    const uniqueAsins = Array.from(new Set(normalizedRows.map((row) => row.asin)));
    const existingAsins = new Set(
      (
        await db.item.findMany({
          where: { asin: { in: uniqueAsins } },
          select: { asin: true },
        })
      ).map((item) => item.asin),
    );

    const seenAsins = new Set<string>();
    const dedupedRows: typeof normalizedRows = [];

    for (const row of normalizedRows) {
      if (existingAsins.has(row.asin) || seenAsins.has(row.asin)) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          asin: row.asin,
          reason: "Duplicate ASIN",
        });
        continue;
      }

      seenAsins.add(row.asin);
      dedupedRows.push(row);
    }

    rowsToCreate = dedupedRows;
  }

  const createdIds: string[] = [];

  await db.$transaction(async (tx) => {
    for (const row of rowsToCreate) {
      const { rowNumber: _rowNumber, ...itemData } = row;
      const created = await tx.item.create({ data: itemData });
      createdIds.push(created.id);
    }
  });

  revalidatePath("/");
  revalidatePath("/items");
  revalidatePath("/needs-attention");
  revalidatePath("/tax-year");
  revalidatePath("/video-tracker");

  return jsonResponse({ importedCount: createdIds.length, rejectedRows });
}
