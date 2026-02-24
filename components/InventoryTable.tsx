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
    <table data-testid="inventory-table">
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
  );
}
