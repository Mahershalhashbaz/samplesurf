import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { centsToDecimalString } from "@/lib/money";
import { toDateInputValue } from "@/lib/dates";

export async function GET() {
  const items = await db.item.findMany({ orderBy: { createdAt: "asc" } });

  const csv = toCsv(
    [
      "id",
      "asin",
      "title",
      "acquisitionType",
      "dispositionType",
      "receivedDate",
      "receiptValue",
      "currency",
      "soldDate",
      "saleProceeds",
      "notes",
      "createdAt",
      "updatedAt",
    ],
    items.map((item) => [
      item.id,
      item.asin,
      item.title,
      item.acquisitionType,
      item.dispositionType,
      toDateInputValue(item.receivedDate),
      centsToDecimalString(item.receiptValueCents),
      item.currency,
      toDateInputValue(item.soldDate),
      centsToDecimalString(item.saleProceedsCents),
      item.notes ?? "",
      item.createdAt.toISOString(),
      item.updatedAt.toISOString(),
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="samplesurf-backup-${stamp}.csv"`,
    },
  });
}
