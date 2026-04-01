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
  const showExpandedMobileFilters =
    Number.isFinite(receivedYear) ||
    (soldStatus ?? "all") !== "all" ||
    Boolean(acquisitionType) ||
    needsAttentionOnly;

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
    <div className="space-y-4 md:space-y-6">
      <section className="app-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink md:text-2xl">Inventory - {selectedYear}</h2>
            <p className="text-sm text-slate1">Filter, review, and update disposition quickly.</p>
          </div>
          <span className="app-pill">Tax Year {selectedYear}</span>
        </div>

        <form className="mt-4 space-y-3 md:hidden" method="GET">
          <input defaultValue={String(selectedYear)} name="year" type="hidden" />
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1"
              defaultValue={search}
              name="search"
              placeholder="Search ASIN or title"
            />
            <button className="btn-primary shrink-0" type="submit">
              Search
            </button>
          </div>

          <details className="rounded-xl border border-[color:var(--border)] bg-ice/35 p-3" open={showExpandedMobileFilters}>
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
              Filters
            </summary>
            <div className="mt-3 grid gap-2">
              <input
                defaultValue={firstString(searchParams.receivedYear) ?? ""}
                name="receivedYear"
                placeholder="Received year"
                type="number"
              />

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

              <label className="inline-flex items-center gap-2 text-sm">
                <input defaultChecked={needsAttentionOnly} name="needsAttentionOnly" type="checkbox" value="1" />
                Needs attention only
              </label>

              <button className="btn-secondary w-full" type="submit">
                Apply Filters
              </button>
            </div>
          </details>
        </form>

        <form className="mt-4 hidden gap-2 md:mt-5 md:grid md:grid-cols-5" method="GET">
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
            <button className="btn-primary ml-auto md:ml-0" type="submit">
              Apply
            </button>
          </div>
        </form>
      </section>

      <section className="app-card overflow-hidden p-0">
        <InventoryTable rows={rows} />
      </section>
    </div>
  );
}
