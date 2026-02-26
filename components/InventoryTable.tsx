"use client";

import { useRouter } from "next/navigation";

import { InlineSoldEditor } from "@/components/InlineSoldEditor";
import { StatusChip } from "@/components/StatusChip";
import { formatCents } from "@/lib/money";

export type InventoryRowView = {
  id: string;
  asin: string;
  title: string;
  acquisitionType: "SAMPLE" | "PURCHASED";
  dispositionType: "KEPT" | "SOLD" | "GAVE_AWAY";
  receivedDate: string;
  soldDate: string;
  saleProceedsCents: number | null;
  receiptValueCents: number;
  gainLossCents: number | null;
  statusLabel: string;
  statusTone: "default" | "ok" | "warn";
  statusHint?: string;
};

type InventoryTableProps = {
  rows: InventoryRowView[];
};

export function InventoryTable({ rows }: InventoryTableProps) {
  const router = useRouter();

  return (
    <div>
      <div className="space-y-3 p-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-slate1">
            No items match your filters.
          </div>
        ) : null}

        {rows.map((row) => (
          <article className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4" key={`card-${row.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{row.title || "(missing title)"}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-slate1">{row.asin}</p>
              </div>
              <StatusChip label={row.statusLabel} tone={row.statusTone} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-slate1">Disposition</dt>
                <dd className="font-medium text-ink">{row.dispositionType}</dd>
              </div>
              <div>
                <dt className="text-slate1">Received</dt>
                <dd className="font-medium text-ink">{row.receivedDate}</dd>
              </div>
              <div>
                <dt className="text-slate1">Receipt Value</dt>
                <dd className="font-medium text-ink">{formatCents(row.receiptValueCents)}</dd>
              </div>
              <div>
                <dt className="text-slate1">Gain/Loss</dt>
                <dd className="font-medium text-ink">{formatCents(row.gainLossCents)}</dd>
              </div>
            </dl>

            {row.statusHint ? <p className="mt-2 text-xs text-amber-700">{row.statusHint}</p> : null}

            <button className="btn-secondary mt-3 w-full" onClick={() => router.push(`/items/${row.id}`)} type="button">
              View / Edit
            </button>
          </article>
        ))}
      </div>

      <table className="hidden md:table" data-testid="inventory-table">
        <thead className="bg-ice text-xs uppercase tracking-wide text-ink/70">
          <tr>
            <th>Received</th>
            <th>ASIN</th>
            <th>Title</th>
            <th>Type</th>
            <th>Disposition</th>
            <th>Receipt Value</th>
            <th>Disposed Date</th>
            <th>Proceeds</th>
            <th>Gain/Loss</th>
            <th>Status</th>
            <th>Inline Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className="cursor-pointer hover:bg-ice/45"
              data-testid={`inventory-row-${row.asin}`}
              key={row.id}
              onClick={() => router.push(`/items/${row.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/items/${row.id}`);
                }
              }}
              tabIndex={0}
            >
              <td>{row.receivedDate}</td>
              <td className="font-mono text-xs">{row.asin}</td>
              <td>{row.title || "(missing title)"}</td>
              <td>{row.acquisitionType}</td>
              <td>{row.dispositionType}</td>
              <td>{formatCents(row.receiptValueCents)}</td>
              <td>{row.soldDate || "-"}</td>
              <td>{formatCents(row.saleProceedsCents)}</td>
              <td>{formatCents(row.gainLossCents)}</td>
              <td>
                <div className="space-y-1">
                  <StatusChip label={row.statusLabel} tone={row.statusTone} />
                  {row.statusHint ? <p className="text-xs text-amber-700">{row.statusHint}</p> : null}
                </div>
              </td>
              <td onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <InlineSoldEditor
                  dispositionType={row.dispositionType}
                  itemId={row.id}
                  saleProceedsCents={row.saleProceedsCents}
                  soldDate={row.soldDate || null}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="text-sm text-slate1" colSpan={11}>
                No items match your filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
