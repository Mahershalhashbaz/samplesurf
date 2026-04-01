"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, DollarSign, Eye, Gift, Loader2, ShoppingBag, X } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { InlineSoldEditor } from "@/components/InlineSoldEditor";
import { StatusChip } from "@/components/StatusChip";
import { buildAmazonDetailUrl, isAmazonDetailAsin } from "@/lib/amazon-link";
import { todayDateInput } from "@/lib/dates";
import { formatCents, parseMoneyToCents } from "@/lib/money";

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
  notes?: string | null;
};

type InventoryTableProps = {
  rows: InventoryRowView[];
};

type QuickActionMode = null | "giveAway" | "sell";

function notesSnippet(value: string | null | undefined): string | null {
  const compact = (value ?? "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }
  return compact.length > 140 ? `${compact.slice(0, 140)}...` : compact;
}

function buildUpdatedRow(
  row: InventoryRowView,
  dispositionType: InventoryRowView["dispositionType"],
  soldDate: string,
  saleProceedsCents: number | null,
): InventoryRowView {
  const normalizedProceeds = dispositionType === "GAVE_AWAY" ? 0 : saleProceedsCents;
  const gainLossCents =
    normalizedProceeds === null ? null : normalizedProceeds - row.receiptValueCents;

  return {
    ...row,
    dispositionType,
    soldDate,
    saleProceedsCents: normalizedProceeds,
    gainLossCents,
    statusLabel: "Disposed",
    statusTone: "ok",
    statusHint: undefined,
  };
}

export function InventoryTable({ rows }: InventoryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localRows, setLocalRows] = useState<InventoryRowView[]>(rows);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [quickActionMode, setQuickActionMode] = useState<QuickActionMode>(null);
  const [quickDate, setQuickDate] = useState(todayDateInput());
  const [quickProceeds, setQuickProceeds] = useState("");
  const [savingQuickAction, setSavingQuickAction] = useState(false);
  const [quickMessage, setQuickMessage] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const selectedRow = useMemo(
    () => localRows.find((row) => row.id === selectedRowId) ?? null,
    [localRows, selectedRowId],
  );

  function itemHref(itemId: string): string {
    const serialized = searchParams.toString();
    return serialized ? `/items/${itemId}?${serialized}` : `/items/${itemId}`;
  }

  function openQuickView(row: InventoryRowView) {
    setSelectedRowId(row.id);
    setQuickActionMode(null);
    setQuickDate(todayDateInput());
    setQuickProceeds("");
    setQuickMessage(null);
    setQuickError(null);
  }

  function closeQuickView() {
    setSelectedRowId(null);
    setQuickActionMode(null);
    setQuickDate(todayDateInput());
    setQuickProceeds("");
    setQuickMessage(null);
    setQuickError(null);
  }

  function openGiveAway(row: InventoryRowView) {
    setSelectedRowId(row.id);
    setQuickActionMode("giveAway");
    setQuickDate(todayDateInput());
    setQuickProceeds("");
    setQuickMessage(null);
    setQuickError(null);
  }

  function openSell(row: InventoryRowView) {
    setSelectedRowId(row.id);
    setQuickActionMode("sell");
    setQuickDate(todayDateInput());
    setQuickProceeds("");
    setQuickMessage(null);
    setQuickError(null);
  }

  async function confirmQuickAction() {
    if (!selectedRow || !quickActionMode) {
      return;
    }

    if (!quickDate) {
      setQuickError("Date is required.");
      return;
    }

    let saleProceedsCents: number | null = null;
    if (quickActionMode === "sell") {
      saleProceedsCents = parseMoneyToCents(quickProceeds);
      if (saleProceedsCents === null || saleProceedsCents < 0) {
        setQuickError("Enter valid sale proceeds.");
        return;
      }
    }

    setSavingQuickAction(true);
    setQuickError(null);
    setQuickMessage(null);

    const dispositionType = quickActionMode === "giveAway" ? "GAVE_AWAY" : "SOLD";

    const response = await fetch(`/api/items/${selectedRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispositionType,
        soldDate: quickDate,
        saleProceedsCents: dispositionType === "GAVE_AWAY" ? 0 : saleProceedsCents,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setQuickError(payload.error ?? "Could not update this item.");
      setSavingQuickAction(false);
      return;
    }

    setLocalRows((current) =>
      current.map((row) =>
        row.id === selectedRow.id
          ? buildUpdatedRow(
              row,
              dispositionType,
              quickDate,
              dispositionType === "GAVE_AWAY" ? 0 : saleProceedsCents,
            )
          : row,
      ),
    );

    setQuickMessage(dispositionType === "GAVE_AWAY" ? "Item marked as given away." : "Item marked as sold.");
    setSavingQuickAction(false);

    window.setTimeout(() => {
      closeQuickView();
    }, 650);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      <div className="space-y-3 p-3 md:hidden">
        {localRows.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-slate1">
            No items match your filters.
          </div>
        ) : null}

        {localRows.map((row) => (
          <article
            className="cursor-pointer rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 transition hover:border-[color:var(--brand-primary)]/35 hover:shadow-soft"
            key={`card-${row.id}`}
            onClick={() => openQuickView(row)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openQuickView(row);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{row.title || "(missing title)"}</p>
                {isAmazonDetailAsin(row.asin) ? (
                  <Link
                    className="mt-1 inline-flex truncate font-mono text-[11px] text-[color:var(--brand-violet)] underline"
                    href={buildAmazonDetailUrl(row.asin)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {row.asin}
                  </Link>
                ) : (
                  <p className="mt-1 truncate font-mono text-[11px] text-slate1">{row.asin}</p>
                )}
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

            <div className="mt-3">
              <Link
                className="btn-secondary inline-flex w-full items-center justify-center gap-1.5"
                href={itemHref(row.id)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Eye aria-hidden="true" size={15} />
                View / Edit
              </Link>
            </div>
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
            <th>View/Edit</th>
            <th>Inline Edit</th>
          </tr>
        </thead>
        <tbody>
          {localRows.map((row) => (
            <tr
              className="cursor-pointer hover:bg-ice/45"
              data-testid={`inventory-row-${row.asin}`}
              key={row.id}
              onClick={() => openQuickView(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openQuickView(row);
                }
              }}
              tabIndex={0}
            >
              <td>{row.receivedDate}</td>
              <td className="font-mono text-xs">
                {isAmazonDetailAsin(row.asin) ? (
                  <Link
                    className="text-[color:var(--brand-violet)] underline"
                    href={buildAmazonDetailUrl(row.asin)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {row.asin}
                  </Link>
                ) : (
                  row.asin
                )}
              </td>
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
                <Link className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5" href={itemHref(row.id)}>
                  <Eye aria-hidden="true" size={14} />
                  View / Edit
                </Link>
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
          {localRows.length === 0 ? (
            <tr>
              <td className="text-sm text-slate1" colSpan={12}>
                No items match your filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {selectedRow ? (
        <div className="fixed inset-0 z-[10010] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button
            aria-label="Close quick view"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={closeQuickView}
            type="button"
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate1">Quick View</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{selectedRow.title || "(missing title)"}</h3>
              </div>
              <button className="btn-secondary inline-flex h-10 w-10 items-center justify-center p-0" onClick={closeQuickView} type="button">
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--border)] bg-ice/45 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate1">ASIN</p>
                <div className="mt-1">
                  {isAmazonDetailAsin(selectedRow.asin) ? (
                    <a
                      className="font-mono text-[color:var(--brand-violet)] underline"
                      href={buildAmazonDetailUrl(selectedRow.asin)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {selectedRow.asin}
                    </a>
                  ) : (
                    <p className="font-mono text-ink">{selectedRow.asin}</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-ice/45 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate1">Status</p>
                <div className="mt-2">
                  <StatusChip label={selectedRow.statusLabel} tone={selectedRow.statusTone} />
                </div>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-ice/45 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate1">Disposition</p>
                <p className="mt-1 font-medium text-ink">{selectedRow.dispositionType}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-ice/45 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate1">Receipt Value</p>
                <p className="mt-1 font-medium text-ink">{formatCents(selectedRow.receiptValueCents)}</p>
              </div>
            </div>

            {notesSnippet(selectedRow.notes) ? (
              <div className="mt-3 rounded-xl border border-[color:var(--border)] bg-ice/45 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate1">Notes</p>
                <p className="mt-1 text-ink">{notesSnippet(selectedRow.notes)}</p>
              </div>
            ) : null}

            {quickError ? <p className="mt-3 text-sm text-red-700">{quickError}</p> : null}
            {quickMessage ? <p className="mt-3 text-sm text-emerald-700">{quickMessage}</p> : null}

            {quickActionMode ? (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-ice/35 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink">
                      <CalendarDays aria-hidden="true" size={14} />
                      {quickActionMode === "giveAway" ? "Give Away Date" : "Sold Date"}
                    </label>
                    <DatePicker
                      id={quickActionMode === "giveAway" ? "inventory-quick-give-away-date" : "inventory-quick-sold-date"}
                      onChange={(nextDate) => setQuickDate(nextDate)}
                      value={quickDate}
                    />
                  </div>
                  {quickActionMode === "sell" ? (
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink">
                        <DollarSign aria-hidden="true" size={14} />
                        Sale Proceeds
                      </label>
                      <input
                        min="0"
                        onChange={(event) => setQuickProceeds(event.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={quickProceeds}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-sm text-slate1">
                      Proceeds will be set to $0.00 for a giveaway.
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    className="btn-primary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
                    disabled={savingQuickAction}
                    onClick={confirmQuickAction}
                    type="button"
                  >
                    {savingQuickAction ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : quickActionMode === "giveAway" ? <Gift aria-hidden="true" size={15} /> : <ShoppingBag aria-hidden="true" size={15} />}
                    {quickActionMode === "giveAway" ? "Confirm Give Away" : "Confirm Sell"}
                  </button>
                  <button
                    className="btn-secondary w-full sm:w-auto"
                    disabled={savingQuickAction}
                    onClick={() => {
                      setQuickActionMode(null);
                      setQuickDate(todayDateInput());
                      setQuickProceeds("");
                      setQuickError(null);
                      setQuickMessage(null);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className="btn-secondary inline-flex items-center justify-center gap-1.5"
                onClick={() => openGiveAway(selectedRow)}
                type="button"
              >
                <Gift aria-hidden="true" size={15} />
                Give Away
              </button>
              <button
                className="btn-secondary inline-flex items-center justify-center gap-1.5"
                onClick={() => openSell(selectedRow)}
                type="button"
              >
                <ShoppingBag aria-hidden="true" size={15} />
                Sell
              </button>
              <Link className="btn-primary inline-flex items-center justify-center gap-1.5 sm:col-span-2" href={itemHref(selectedRow.id)}>
                <Eye aria-hidden="true" size={15} />
                Open Full Item Page
              </Link>
              <button className="btn-secondary sm:col-span-2" onClick={closeQuickView} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
