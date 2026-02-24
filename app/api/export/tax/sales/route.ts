import { gainLossCents, proceedsCents } from "@/lib/accounting";
import { toCsv } from "@/lib/csv";
import { toDateInputValue } from "@/lib/dates";
import { getTaxYearData } from "@/lib/queries";
import { centsToDecimalString } from "@/lib/money";

function parseYear(input: string | null): number {
  const nowYear = new Date().getUTCFullYear();
  const fallback = Number.isFinite(nowYear) ? nowYear : 2026;
  if (!input) {
    return fallback;
  }
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = parseYear(url.searchParams.get("year"));
  const data = await getTaxYearData(year);

  const csv = toCsv(
    ["disposedDate", "dispositionType", "asin", "title", "proceeds", "basis", "gainLoss"],
    data.dispositionLines.map((item) => [
      toDateInputValue(item.soldDate),
      item.dispositionType,
      item.asin,
      item.title,
      centsToDecimalString(proceedsCents(item)),
      centsToDecimalString(item.receiptValueCents),
      centsToDecimalString(gainLossCents(item)),
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dispositions-${year}.csv"`,
    },
  });
}
