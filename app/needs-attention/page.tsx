import { NeedsAttentionQuickFix } from "@/components/NeedsAttentionQuickFix";
import { toDateInputValue } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getNeedsAttentionItems } from "@/lib/queries";
import { parseTaxYear } from "@/lib/year";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function firstString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function NeedsAttentionPage({ searchParams }: PageProps) {
  const year = parseTaxYear(firstString(searchParams.year));
  const items = await getNeedsAttentionItems();

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Needs Attention - {year}</h2>
            <p className="text-sm text-slate1">
              Items with missing/invalid fields that can impact tax summaries.
            </p>
          </div>
          <span className="app-pill">{items.length} issue item(s)</span>
        </div>
      </section>

      <section className="app-card overflow-x-auto p-0">
        <table>
          <thead className="bg-ice text-xs uppercase tracking-wide text-ink/70">
            <tr>
              <th>ASIN</th>
              <th>Title</th>
              <th>Disposition</th>
              <th>Received</th>
              <th>Receipt Value</th>
              <th>Disposed Date</th>
              <th>Proceeds</th>
              <th>Reasons</th>
              <th>Quick Fix</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ item, reasons }) => (
              <tr key={item.id}>
                <td className="font-mono text-xs">{item.asin}</td>
                <td>{item.title || "(missing title)"}</td>
                <td>{item.dispositionType}</td>
                <td>{toDateInputValue(item.receivedDate)}</td>
                <td>{formatCents(item.receiptValueCents)}</td>
                <td>{toDateInputValue(item.soldDate)}</td>
                <td>{formatCents(item.saleProceedsCents)}</td>
                <td>
                  <ul className="list-disc pl-4 text-sm text-amber-700">
                    {reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <NeedsAttentionQuickFix
                    currentDispositionType={item.dispositionType as "KEPT" | "SOLD" | "GAVE_AWAY"}
                    currentSaleProceedsCents={item.saleProceedsCents}
                    currentSoldDate={toDateInputValue(item.soldDate) || null}
                    currentTitle={item.title}
                    itemId={item.id}
                    reasons={reasons}
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="text-sm text-slate1" colSpan={9}>
                  No issues found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
