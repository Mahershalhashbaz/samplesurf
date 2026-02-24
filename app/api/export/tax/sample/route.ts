import { getTaxYearData } from "@/lib/queries";
import { toCsv } from "@/lib/csv";
import { toDateInputValue } from "@/lib/dates";
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
    ["receivedDate", "asin", "title", "receiptValue"],
    data.sampleIncomeLines.map((item) => [
      toDateInputValue(item.receivedDate),
      item.asin,
      item.title,
      centsToDecimalString(item.receiptValueCents),
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sample-income-${year}.csv"`,
    },
  });
}
