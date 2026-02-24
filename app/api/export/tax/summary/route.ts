import { toCsv } from "@/lib/csv";
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
    [
      "year",
      "grossSampleIncomeTotal",
      "proceedsTotal",
      "basisTotal",
      "gainLossTotal",
      "lossTotal",
      "netTotal",
    ],
    [
      [
        String(year),
        centsToDecimalString(data.totals.sampleIncomeTotalCents),
        centsToDecimalString(data.totals.proceedsTotalCents),
        centsToDecimalString(data.totals.basisTotalCents),
        centsToDecimalString(data.totals.gainLossTotalCents),
        centsToDecimalString(data.totals.lossTotalCents),
        centsToDecimalString(data.totals.netTotalCents),
      ],
    ],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tax-summary-${year}.csv"`,
    },
  });
}
