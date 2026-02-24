import { Download } from "lucide-react";

import { gainLossCents, proceedsCents } from "@/lib/accounting";
import { toDateInputValue } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getTaxYearData } from "@/lib/queries";
import { parseTaxYear } from "@/lib/year";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function firstString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function TaxYearPage({ searchParams }: PageProps) {
  const year = parseTaxYear(firstString(searchParams.year));
  const data = await getTaxYearData(year);

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Tax Year View - {year}</h2>
            <p className="text-sm text-slate1">
              Receipt and disposition events are computed independently by event date.
            </p>
          </div>
          <span className="app-pill">Tax Year {year}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-secondary inline-flex items-center gap-1.5" href={`/api/export/tax/sample?year=${year}`}>
            <Download aria-hidden="true" size={15} />
            Export Sample Income CSV
          </a>
          <a className="btn-secondary inline-flex items-center gap-1.5" href={`/api/export/tax/sales?year=${year}`}>
            <Download aria-hidden="true" size={15} />
            Export Dispositions CSV
          </a>
          <a className="btn-secondary inline-flex items-center gap-1.5" href={`/api/export/tax/summary?year=${year}`}>
            <Download aria-hidden="true" size={15} />
            Export Summary CSV
          </a>
        </div>
      </section>

      <section className="app-card">
        <h3 className="text-base font-semibold text-ink">
          Section A ({year}): Sample income recognized by receivedDate
        </h3>
        <p className="mb-3 text-sm text-slate1" data-testid="tax-section-a-total">
          Total sample income: {formatCents(data.totals.sampleIncomeTotalCents)}
        </p>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table>
            <thead className="bg-ice text-xs uppercase tracking-wide text-ink/70">
              <tr>
                <th>Received Date</th>
                <th>ASIN</th>
                <th>Title</th>
                <th>Receipt Value</th>
              </tr>
            </thead>
            <tbody>
              {data.sampleIncomeLines.map((item) => (
                <tr data-testid={`tax-a-row-${item.asin}`} key={item.id}>
                  <td>{toDateInputValue(item.receivedDate)}</td>
                  <td className="font-mono text-xs">{item.asin}</td>
                  <td>{item.title}</td>
                  <td>{formatCents(item.receiptValueCents)}</td>
                </tr>
              ))}
              {data.sampleIncomeLines.length === 0 ? (
                <tr>
                  <td className="text-sm text-slate1" colSpan={4}>
                    No sample receipt income for this year.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card">
        <h3 className="text-base font-semibold text-ink">
          Section B ({year}): Dispositions recognized by disposed date
        </h3>
        <div className="mb-3 grid gap-1 text-sm text-ink/80 sm:grid-cols-3">
          <p>Total proceeds: {formatCents(data.totals.proceedsTotalCents)}</p>
          <p>Total basis: {formatCents(data.totals.basisTotalCents)}</p>
          <p data-testid="tax-section-b-total">Total gain/loss: {formatCents(data.totals.gainLossTotalCents)}</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table>
            <thead className="bg-ice text-xs uppercase tracking-wide text-ink/70">
              <tr>
                <th>Disposed Date</th>
                <th>Disposition</th>
                <th>ASIN</th>
                <th>Title</th>
                <th>Proceeds</th>
                <th>Basis</th>
                <th>Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {data.dispositionLines.map((item) => (
                <tr data-testid={`tax-b-row-${item.asin}`} key={item.id}>
                  <td>{toDateInputValue(item.soldDate)}</td>
                  <td>{item.dispositionType}</td>
                  <td className="font-mono text-xs">{item.asin}</td>
                  <td>{item.title}</td>
                  <td>{formatCents(proceedsCents(item))}</td>
                  <td>{formatCents(item.receiptValueCents)}</td>
                  <td>{formatCents(gainLossCents(item))}</td>
                </tr>
              ))}
              {data.dispositionLines.length === 0 ? (
                <tr>
                  <td className="text-sm text-slate1" colSpan={7}>
                    No recognized dispositions for this year.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
