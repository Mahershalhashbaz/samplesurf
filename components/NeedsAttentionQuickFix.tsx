"use client";

import Link from "next/link";
import { useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { centsToDecimalString, parseMoneyToCents } from "@/lib/money";
import { todayDateInput } from "@/lib/dates";

type NeedsAttentionQuickFixProps = {
  itemId: string;
  reasons: string[];
  currentTitle: string;
  currentDispositionType: "KEPT" | "SOLD" | "GAVE_AWAY";
  currentSoldDate: string | null;
  currentSaleProceedsCents: number | null;
};

export function NeedsAttentionQuickFix({
  itemId,
  reasons,
  currentTitle,
  currentDispositionType,
  currentSoldDate,
  currentSaleProceedsCents,
}: NeedsAttentionQuickFixProps) {
  const [title, setTitle] = useState(currentTitle);
  const [soldDate, setSoldDate] = useState(currentSoldDate ?? todayDateInput());
  const [saleProceeds, setSaleProceeds] = useState(centsToDecimalString(currentSaleProceedsCents));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFixTitle = reasons.includes("Missing title");
  const canFixProceeds = reasons.includes("SOLD item is missing sale proceeds");
  const canFixDisposedDate =
    reasons.includes("SOLD item is missing disposed date") ||
    reasons.includes("GAVE_AWAY item is missing disposed date");
  const canFixGivenAwayProceeds = reasons.includes("GAVE_AWAY proceeds must be 0");
  const canResetKept =
    reasons.includes("KEPT item should not have disposed date") ||
    reasons.includes("KEPT item should not have sale proceeds");

  async function savePatch(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save");
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  async function fixTitle() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    await savePatch({ title: title.trim() });
  }

  async function fixProceeds() {
    const cents = parseMoneyToCents(saleProceeds);
    if (cents === null || cents < 0) {
      setError("Valid sale proceeds are required");
      return;
    }

    await savePatch({ saleProceedsCents: cents, dispositionType: "SOLD" });
  }

  async function fixDisposedDate() {
    if (!soldDate) {
      setError("Disposed date is required");
      return;
    }

    await savePatch({
      soldDate,
      dispositionType: currentDispositionType === "KEPT" ? "SOLD" : currentDispositionType,
    });
  }

  async function fixGivenAwayProceeds() {
    await savePatch({ dispositionType: "GAVE_AWAY", saleProceedsCents: 0 });
  }

  async function resetKept() {
    await savePatch({ dispositionType: "KEPT", soldDate: null, saleProceedsCents: null });
  }

  return (
    <div className="space-y-2">
      {canFixTitle ? (
        <div className="flex flex-wrap items-center gap-1">
          <input className="w-44" onChange={(e) => setTitle(e.target.value)} placeholder="Set title" value={title} />
          <button className="btn-secondary px-3 py-1" disabled={saving} onClick={fixTitle} type="button">
            Save title
          </button>
        </div>
      ) : null}

      {canFixDisposedDate ? (
        <div className="flex flex-wrap items-center gap-1">
          <div className="w-[220px]">
            <DatePicker
              allowClear={false}
              id={`needs-attention-date-${itemId}`}
              inputClassName="w-full"
              onChange={setSoldDate}
              value={soldDate}
            />
          </div>
          <button className="btn-secondary px-3 py-1" disabled={saving} onClick={fixDisposedDate} type="button">
            Save date
          </button>
        </div>
      ) : null}

      {canFixProceeds ? (
        <div className="flex flex-wrap items-center gap-1">
          <input
            className="w-32"
            min="0"
            onChange={(e) => setSaleProceeds(e.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={saleProceeds}
          />
          <button className="btn-secondary px-3 py-1" disabled={saving} onClick={fixProceeds} type="button">
            Save proceeds
          </button>
        </div>
      ) : null}

      {canFixGivenAwayProceeds ? (
        <button className="btn-secondary px-3 py-1" disabled={saving} onClick={fixGivenAwayProceeds} type="button">
          Set GAVE_AWAY proceeds to 0
        </button>
      ) : null}

      {canResetKept ? (
        <button className="btn-secondary px-3 py-1" disabled={saving} onClick={resetKept} type="button">
          Reset to KEPT
        </button>
      ) : null}

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      <Link href={`/items/${itemId}`}>Open details</Link>
    </div>
  );
}
