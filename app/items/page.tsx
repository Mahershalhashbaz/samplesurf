import { InventoryTable, type InventoryRowView } from "@/components/InventoryTable";
import { gainLossCents } from "@/lib/accounting";
import { toDateInputValue } from "@/lib/dates";
import { getNeedsAttentionReasons } from "@/lib/needs-attention";
import { getInventoryItems } from "@/lib/queries";
import { parseTaxYear } from "@/lib/year";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function firstString(input: string | string[] | undefined): string | undefined {
  if (Array.isArray(input)) {
    return input[0];
  }
  return input;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const selectedYear = parseTaxYear(firstString(searchParams.year));
  const receivedYear = Number.parseInt(firstString(searchParams.receivedYear) ?? "", 10);
  const soldStatus = firstString(searchParams.soldStatus) as "all" | "sold" | "unsold" | undefined;
  const acquisitionType = firstString(searchParams.acquisitionType) as
    | "SAMPLE"
    | "PURCHASED"
    | undefined;
  const needsAttentionOnly = firstString(searchParams.needsAttentionOnly) === "1";
  const search = firstString(searchParams.search) ?? "";

  const items = await getInventoryItems({
    receivedYear: Number.isFinite(receivedYear) ? receivedYear : undefined,
    soldStatus: soldStatus ?? "all",
    acquisitionType,
    needsAttentionOnly,
    search,
  });

  const rows: InventoryRowView[] = items.map((item) => {
    const reasons = getNeedsAttentionReasons(item);
    const isDisposed = item.dispositionType === "SOLD" || item.dispositionType === "GAVE_AWAY";

    return {
      id: item.id,
      asin: item.asin,
      title: item.title,
      acquisitionType: item.acquisitionType as "SAMPLE" | "PURCHASED",
      dispositionType: item.dispositionType as "KEPT" | "SOLD" | "GAVE_AWAY",
      receivedDate: toDateInputValue(item.receivedDate),
      soldDate: toDateInputValue(item.soldDate),
      saleProceedsCents: item.saleProceedsCents,
      receiptValueCents: item.receiptValueCents,
      gainLossCents: gainLossCents(item),
      statusLabel: reasons.length ? "Needs attention" : isDisposed ? "Disposed" : "In inventory",
      statusTone: reasons.length ? "warn" : isDisposed ? "ok" : "default",
      statusHint: reasons[0],
    };
  });

  return (
    <div className="space-y-6">
      <section className="app-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Inventory - {selectedYear}</h2>
            <p className="text-sm text-slate1">Filter, review, and update disposition quickly.</p>
          </div>
          <span className="app-pill">Tax Year {selectedYear}</span>
        </div>

        <form className="mt-5 grid gap-2 md:grid-cols-5" method="GET">
          <input defaultValue={String(selectedYear)} name="year" type="hidden" />
          <input defaultValue={firstString(searchParams.receivedYear) ?? ""} name="receivedYear" placeholder="Received year" type="number" />

          <select defaultValue={soldStatus ?? "all"} name="soldStatus">
            <option value="all">All dispositions</option>
            <option value="sold">Disposed (SOLD/GAVE_AWAY)</option>
            <option value="unsold">KEPT only</option>
          </select>

          <select defaultValue={acquisitionType ?? ""} name="acquisitionType">
            <option value="">All acquisition types</option>
            <option value="SAMPLE">Sample</option>
            <option value="PURCHASED">Purchased</option>
          </select>

          <input defaultValue={search} name="search" placeholder="Search ASIN or title" />

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1 text-sm">
              <input defaultChecked={needsAttentionOnly} name="needsAttentionOnly" type="checkbox" value="1" />
              Needs attention only
            </label>
            <button className="btn-primary" type="submit">
              Apply
            </button>
          </div>
        </form>
      </section>

      <section className="app-card overflow-x-auto p-0">
        <InventoryTable rows={rows} />
      </section>
    </div>
  );
}
